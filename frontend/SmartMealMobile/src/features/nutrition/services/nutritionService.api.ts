import { getMetaCatalog } from '@/features/health';
import { ENDPOINTS, api } from '@/services/api';
import { getIncludeActivityCalories } from '@/state/user/userProfileStore';
import type { PagedResult } from '@/types/api';
import type { MealType } from '@/types/meal.types';
import { addDaysIso } from '@/utils/date';
import type {
  CreateFoodRequestDto,
  DailyDiarySummaryDto,
  DiaryItemDto,
  FoodFavoriteDto,
  FoodItemDto,
  LogMealBatchRequestDto,
  UpdateDiaryItemRequestDto,
  WeeklyProgressDto,
} from '../types/nutrition.api.types';
import type {
  DiaryDaySummary,
  FoodItem,
  FoodSearchFilter,
  MealLogEntry,
  NewFoodInput,
  NewMealLogInput,
  WeeklyProgressSummary,
} from '../types/nutrition.types';
import { findEntryById } from '../utils/diary';
import { scaleNutritionByGrams } from '../utils/nutritionMath';
import { healthSyncService } from './healthSyncService';
import {
  fromDailyDiaryDto,
  fromDiaryItemDto,
  fromFoodDto,
  fromMonthlyProgressDto,
  fromWeeklyProgressDto,
  toCreateFoodRequest,
  toLogMealBatchRequest,
  toUpdateDiaryItemRequest,
} from './nutrition.mapper';

// Bản gọi backend thật (docs/fetch-api/part1 §7): nhật ký (ghi cả bữa một lần, sửa bằng PUT, tiến
// độ tuần kèm macro) và danh mục thực phẩm (tìm theo scope, yêu thích, món tự nhập).

const FOOD_PAGE_SIZE = 20;
const WEEK_LENGTH_DAYS = 7;
const MONTH_LENGTH_DAYS = 30;

function getDailyDto(dateIso: string): Promise<DailyDiarySummaryDto> {
  return api.get<DailyDiarySummaryDto>(ENDPOINTS.nutritionDiary.daily, { params: { date: dateIso } });
}

async function fetchDiaryDay(dateIso: string): Promise<DiaryDaySummary> {
  const [daily, activity] = await Promise.all([
    getDailyDto(dateIso),
    // Calo vận động chỉ là phần cộng thêm: lỗi → coi là 0, không làm hỏng cả nhật ký.
    healthSyncService.getDailySummary(dateIso).catch(() => null),
  ]);

  return fromDailyDiaryDto(daily, {
    activityCaloriesBurned: activity?.caloriesBurned ?? 0,
    includeActivityCalories: getIncludeActivityCalories(),
  });
}

async function toFoodItem(dto: FoodItemDto): Promise<FoodItem> {
  // Đổi id dị ứng của BE sang slug của FE bằng danh mục /meta theo code (cảnh báo dị ứng BR-102).
  const { allergies } = await getMetaCatalog();
  return fromFoodDto(dto, allergies.codeById);
}

export const nutritionApiService = {
  // GET /nutritiondiary/daily + GET /health-sync/daily-summary (song song).
  getDiaryDay: fetchDiaryDay,

  // POST /nutritiondiary/log/batch — cả bữa trong MỘT request: BE lưu hết hoặc không lưu món nào
  // (một transaction), nên không còn trạng thái "lưu được một phần" cần xử lý ở FE.
  // `idempotencyKey` → header Idempotency-Key: gửi lại cùng khóa (hàng đợi offline) thì máy chủ trả lại
  // kết quả lần đầu, không ghi trùng (F12). Payload phải giống hệt lần đầu — mapper không chứa giờ gửi.
  async addLogEntries(
    dateIso: string,
    mealType: MealType,
    inputs: NewMealLogInput[],
    options?: { idempotencyKey?: string },
  ): Promise<MealLogEntry[]> {
    if (inputs.length === 0) return [];

    const created = await api.post<DiaryItemDto[], LogMealBatchRequestDto>(
      ENDPOINTS.nutritionDiary.logBatch,
      toLogMealBatchRequest(dateIso, mealType, inputs),
      options?.idempotencyKey ? { headers: { 'Idempotency-Key': options.idempotencyKey } } : undefined,
    );
    return created.map(dto => fromDiaryItemDto(dto, mealType));
  },

  // PUT /nutritiondiary/items/{id} — BE chỉ đổi các trường có mặt. Đổi khối lượng thì dinh dưỡng
  // phải tính lại từ nutritionPerGram của chính bản ghi (BR-053) nên cần đọc bản ghi hiện tại;
  // chỉ đổi bữa thì không cần.
  async updateLogEntry(
    dateIso: string,
    entryId: string,
    patch: { grams?: number; mealType?: MealType },
  ): Promise<MealLogEntry> {
    let request: UpdateDiaryItemRequestDto = toUpdateDiaryItemRequest({ mealType: patch.mealType });

    if (patch.grams !== undefined) {
      const existing = findEntryById(
        fromDailyDiaryDto(await getDailyDto(dateIso), {
          activityCaloriesBurned: 0,
          includeActivityCalories: false,
        }),
        entryId,
      );
      if (!existing) {
        throw new Error('Không tìm thấy bản ghi để sửa.');
      }
      request = toUpdateDiaryItemRequest({
        mealType: patch.mealType,
        grams: patch.grams,
        nutrition: scaleNutritionByGrams(existing.nutritionPerGram, patch.grams),
      });
    }

    const updated = await api.put<DiaryItemDto, UpdateDiaryItemRequestDto>(
      ENDPOINTS.nutritionDiary.item(entryId),
      request,
    );
    return fromDiaryItemDto(updated);
  },

  // DELETE /nutritiondiary/items/{id}.
  async deleteLogEntry(_dateIso: string, entryId: string): Promise<void> {
    await api.delete<boolean>(ENDPOINTS.nutritionDiary.item(entryId));
  },

  // GET /foods?search=&scope=all|recent|favorite|mine&page=1&pageSize=20 — bộ lọc của màn tìm món
  // trùng với `scope` của BE (BE tìm không dấu: "pho" ra "Phở").
  async searchFoods(query: string, filter: FoodSearchFilter): Promise<FoodItem[]> {
    const search = query.trim();
    const page = await api.get<PagedResult<FoodItemDto>>(ENDPOINTS.foods.list, {
      params: { search: search || undefined, scope: filter, page: 1, pageSize: FOOD_PAGE_SIZE },
    });
    return Promise.all(page.items.map(toFoodItem));
  },

  // GET /foods/{id} — gồm món do chính người dùng tự nhập.
  async getFoodById(foodId: string): Promise<FoodItem | undefined> {
    return toFoodItem(await api.get<FoodItemDto>(ENDPOINTS.foods.byId(foodId)));
  },

  // POST /foods — món tự nhập (BR-121): BE gắn "do người dùng nhập", chưa xác minh, chỉ chủ sở hữu thấy.
  async createFood(input: NewFoodInput): Promise<FoodItem> {
    return toFoodItem(
      await api.post<FoodItemDto, CreateFoodRequestDto>(
        ENDPOINTS.foods.list,
        toCreateFoodRequest(input),
      ),
    );
  },

  // POST|DELETE /foods/{id}/favorite — idempotent: bấm lặp vẫn ra đúng trạng thái yêu cầu.
  async setFoodFavorite(foodId: string, isFavorite: boolean): Promise<boolean> {
    const result = isFavorite
      ? await api.post<FoodFavoriteDto>(ENDPOINTS.foods.favorite(foodId))
      : await api.delete<FoodFavoriteDto>(ENDPOINTS.foods.favorite(foodId));
    return result.isFavorite;
  },

  // GET /nutritiondiary/weekly-progress?startDate= — 7 ngày kết thúc ở `dateIso`.
  async getWeeklyProgress(dateIso: string): Promise<WeeklyProgressSummary> {
    const dto = await api.get<WeeklyProgressDto>(ENDPOINTS.nutritionDiary.weeklyProgress, {
      params: { startDate: addDaysIso(dateIso, -(WEEK_LENGTH_DAYS - 1)) },
    });
    return fromWeeklyProgressDto(dto, dateIso);
  },

  // GET /nutritiondiary/progress?startDate=&endDate= — 30 ngày kết thúc ở `dateIso` (tab "Tháng").
  async getMonthlyProgress(dateIso: string): Promise<WeeklyProgressSummary> {
    const dto = await api.get<WeeklyProgressDto>(ENDPOINTS.nutritionDiary.progress, {
      params: { startDate: addDaysIso(dateIso, -(MONTH_LENGTH_DAYS - 1)), endDate: dateIso },
    });
    return fromMonthlyProgressDto(dto, dateIso);
  },
};
