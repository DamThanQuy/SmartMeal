import { getMetaCatalog } from '@/features/health';
import { ENDPOINTS, api, isApiError, type ApiErrorCode } from '@/services/api';
import { getIncludeActivityCalories } from '@/state/user/userProfileStore';
import type { PagedResult } from '@/types/api';
import { addDaysIso } from '@/utils/date';
import type {
  DailyDiarySummaryDto,
  DiaryItemDto,
  FoodItemDto,
  LogMealRequestDto,
  WeeklyProgressDto,
} from '../types/nutrition.api.types';
import type { DiaryDaySummary, MealLogEntry, NewMealLogInput } from '../types/nutrition.types';
import { findEntryById } from '../utils/diary';
import { scaleNutritionByGrams } from '../utils/nutritionMath';
import { healthSyncService } from './healthSyncService';
import { PartialLogError, UpdateIncompleteError } from './nutrition.errors';
import {
  fromDailyDiaryDto,
  fromDiaryItemDto,
  fromFoodDto,
  fromWeeklyProgressDto,
  sourceToLogMethod,
  toLogMealRequest,
} from './nutrition.mapper';
import type { nutritionMockService } from './nutritionService.mock';
import { findUserCreatedFood, listUserCreatedFoods } from './userFoods';

// Bản gọi backend thật (docs/fetch-api/part1 §7). Chỉ khai báo hàm đã nối API; createFood chưa có
// endpoint (P1-BE-08) nên tự rơi về bản mock trong nutritionService.ts.

const FOOD_PAGE_SIZE = 20;
const WEEK_LENGTH_DAYS = 7;

// Lỗi hạ tầng: các món còn lại cũng sẽ lỗi nên dừng lại thay vì chờ từng request hết hạn.
const STOP_ON_ERROR_CODES: readonly ApiErrorCode[] = ['NETWORK', 'TIMEOUT', 'UNAUTHORIZED'];

async function fetchDiaryDay(dateIso: string): Promise<DiaryDaySummary> {
  const [daily, activity] = await Promise.all([
    api.get<DailyDiarySummaryDto>(ENDPOINTS.nutritionDiary.daily, { params: { date: dateIso } }),
    // Calo vận động chỉ là phần cộng thêm: lỗi → coi là 0, không làm hỏng cả nhật ký.
    healthSyncService.getDailySummary(dateIso).catch(() => null),
  ]);

  return fromDailyDiaryDto(daily, {
    activityCaloriesBurned: activity?.caloriesBurned ?? 0,
    includeActivityCalories: getIncludeActivityCalories(),
  });
}

export const nutritionApiService: Partial<typeof nutritionMockService> = {
  // GET /nutritiondiary/daily + GET /health-sync/daily-summary (song song).
  getDiaryDay: fetchDiaryDay,

  // POST /nutritiondiary/log × N. BE không có batch. Gọi TUẦN TỰ chứ không song song: BE tìm-hoặc-
  // tạo dòng nhóm (ngày + bữa) và không có ràng buộc duy nhất, nên N request song song cho cùng
  // một bữa chưa có dòng nhóm sẽ tạo N dòng trùng — món ở các dòng sau không hiện trong
  // /daily nhưng vẫn bị cộng vào tổng calo.
  async addLogEntries(dateIso, mealType, inputs) {
    const created: MealLogEntry[] = [];
    const failed: NewMealLogInput[] = [];
    let firstError: unknown;
    let stopped = false;

    for (const input of inputs) {
      if (stopped) {
        failed.push(input);
        continue;
      }
      try {
        const dto = await api.post<DiaryItemDto, LogMealRequestDto>(
          ENDPOINTS.nutritionDiary.log,
          toLogMealRequest(dateIso, mealType, input),
        );
        created.push(fromDiaryItemDto(dto, mealType, new Date().toISOString()));
      } catch (error) {
        failed.push(input);
        if (firstError === undefined) firstError = error;
        if (isApiError(error) && STOP_ON_ERROR_CODES.includes(error.code)) stopped = true;
      }
    }

    if (failed.length === 0) return created;
    // Không lưu được món nào → báo lỗi gốc (có message tiếng Việt từ ApiError).
    if (created.length === 0) throw firstError;
    throw new PartialLogError(created, failed);
  },

  // BE chưa có PUT (P1-BE-05): ghi bản mới RỒI mới xóa bản cũ (id đổi). Không xóa trước để nếu
  // ghi lỗi thì không mất món.
  async updateLogEntry(dateIso, entryId, patch) {
    const diary = await fetchDiaryDay(dateIso);
    const existing = findEntryById(diary, entryId);
    if (!existing) {
      throw new Error('Không tìm thấy bản ghi để sửa.');
    }

    const nextAmount = patch.grams ?? existing.grams;
    const nextMealType = patch.mealType ?? existing.mealType;
    const dto = await api.post<DiaryItemDto, LogMealRequestDto>(
      ENDPOINTS.nutritionDiary.log,
      toLogMealRequest(
        dateIso,
        nextMealType,
        {
          foodName: existing.foodName,
          servingLabel: existing.servingLabel,
          grams: nextAmount,
          nutrition: scaleNutritionByGrams(existing.nutritionPerGram, nextAmount),
          source: existing.source,
          aiConfirmed: existing.aiConfirmed,
          logMethod: sourceToLogMethod(existing.source),
        },
        existing.unit,
      ),
    );
    const updated = fromDiaryItemDto(dto, nextMealType, new Date().toISOString());

    try {
      await api.delete<boolean>(ENDPOINTS.nutritionDiary.item(entryId));
    } catch {
      throw new UpdateIncompleteError(updated);
    }
    return updated;
  },

  // DELETE /nutritiondiary/items/{id}.
  async deleteLogEntry(_dateIso, entryId) {
    await api.delete<boolean>(ENDPOINTS.nutritionDiary.item(entryId));
  },

  // GET /foods?search=&page=1&pageSize=20 — chỉ bộ lọc 'all' có dữ liệu từ BE; 'recent'/'favorite'
  // chưa có nguồn nào (không trả món giả); 'mine' là món người dùng tự nhập, chỉ ở máy.
  async searchFoods(query, filter) {
    if (filter === 'mine') return listUserCreatedFoods();
    if (filter !== 'all') return [];

    const normalizedQuery = query.trim();
    const page = await api.get<PagedResult<FoodItemDto>>(ENDPOINTS.foods.list, {
      params: { search: normalizedQuery || undefined, page: 1, pageSize: FOOD_PAGE_SIZE },
    });
    const { allergies } = await getMetaCatalog();
    const remote = page.items.map(dto => fromFoodDto(dto, allergies.codeById));

    if (!normalizedQuery) return remote;
    const lowerQuery = normalizedQuery.toLowerCase();
    const local = listUserCreatedFoods().filter(food => food.name.toLowerCase().includes(lowerQuery));
    return [...local, ...remote];
  },

  // GET /foods/{id}; món người dùng tự nhập (không có trên BE) lấy ở máy.
  async getFoodById(foodId) {
    const local = findUserCreatedFood(foodId);
    if (local) return local;
    const dto = await api.get<FoodItemDto>(ENDPOINTS.foods.byId(foodId));
    const { allergies } = await getMetaCatalog();
    return fromFoodDto(dto, allergies.codeById);
  },

  // GET /nutritiondiary/weekly-progress?startDate= — 7 ngày kết thúc ở `dateIso`.
  async getWeeklyProgress(dateIso) {
    const dto = await api.get<WeeklyProgressDto>(ENDPOINTS.nutritionDiary.weeklyProgress, {
      params: { startDate: addDaysIso(dateIso, -(WEEK_LENGTH_DAYS - 1)) },
    });
    return fromWeeklyProgressDto(dto, dateIso);
  },
};
