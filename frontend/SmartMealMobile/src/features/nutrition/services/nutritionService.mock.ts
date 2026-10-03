import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { getIncludeActivityCalories } from '@/state/user/userProfileStore';
import type { MealType } from '@/types/meal.types';
import { MEAL_TYPES } from '@/types/meal.types';
import { todayIso } from '@/utils/date';
import {
  CURRENT_USER_DAILY_TARGET,
  createTodaySeedEntries,
  TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
} from '../mocks/diary.mock';
import { FOOD_DATABASE_MOCK } from '../mocks/foods.mock';
import { createWeeklyProgressMock } from '../mocks/progress.mock';
import type {
  DiaryDaySummary,
  FoodItem,
  FoodSearchFilter,
  MealLogEntry,
  NewFoodInput,
  NewMealLogInput,
  WeeklyProgressSummary,
} from '../types/nutrition.types';
import { calculateCalorieBudget, nutritionPerGram, sumNutrition } from '../utils/nutritionMath';
import { addUserCreatedFood, findUserCreatedFood, listUserCreatedFoods } from './userFoods';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API=true) — bản gọi API thật nằm ở nutritionService.api.ts,
// nutritionService.ts chọn giữa hai bản.
// TODO: replace mock with real API — toàn bộ "database" dưới đây chỉ là in-memory store mô
// phỏng Backend cho nhánh feat/mock-ui (CLAUDE.md mục 8). Các hàm export giữ nguyên chữ ký khi
// nối API thật.

const diaryByDate = new Map<string, Record<MealType, MealLogEntry[]>>();

function emptyMealRecord(): Record<MealType, MealLogEntry[]> {
  return { breakfast: [], lunch: [], dinner: [], snack: [] };
}

function getOrSeedDay(dateIso: string): Record<MealType, MealLogEntry[]> {
  const existing = diaryByDate.get(dateIso);
  if (existing) return existing;

  const seeded = dateIso === todayIso() ? createTodaySeedEntries(dateIso) : emptyMealRecord();
  diaryByDate.set(dateIso, seeded);
  return seeded;
}

function buildSummary(
  dateIso: string,
  entriesByMeal: Record<MealType, MealLogEntry[]>,
): DiaryDaySummary {
  // BR-040→042 — đúng 1 hàm tính (calculateCalorieBudget) dùng chung với CalorieBudgetScreen,
  // tôn trọng công tắc "Cộng calo vận động vào ngân sách" (userProfileStore).
  const { activityCalories } = calculateCalorieBudget({
    calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget,
    activityCaloriesBurned: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
    includeActivityCalories: getIncludeActivityCalories(),
  });
  return {
    date: dateIso,
    calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget,
    activityCalories,
    entriesByMeal,
    macroTargets: CURRENT_USER_DAILY_TARGET.macroTargets,
  };
}

function totalCaloriesForDay(entriesByMeal: Record<MealType, MealLogEntry[]>): number {
  const allEntries = MEAL_TYPES.flatMap(type => entriesByMeal[type]);
  return sumNutrition(allEntries.map(entry => entry.nutrition)).calories;
}

let logIdCounter = 0;
function nextLogId(): string {
  logIdCounter += 1;
  return `log-${Date.now()}-${logIdCounter}`;
}

const RECENT_FOOD_IDS = ['bun-bo', 'sua-chua'];

// Món yêu thích trong bản giả lập (nằm ở máy, xóa cùng dữ liệu cá nhân).
const favoriteFoodIds = new Set<string>();

function withFavoriteFlag(food: FoodItem): FoodItem {
  return { ...food, isFavorite: favoriteFoodIds.has(food.id) };
}

export function findFoodById(foodId: string): FoodItem | undefined {
  return FOOD_DATABASE_MOCK.find(food => food.id === foodId) ?? findUserCreatedFood(foodId);
}

export const nutritionMockService = {
  // BR-050, BR-051 — đọc nhật ký 1 ngày, gộp theo bữa.
  async getDiaryDay(dateIso: string): Promise<DiaryDaySummary> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải nhật ký, vui lòng thử lại.');
    }
    if (scenario === 'empty') {
      return buildSummary(dateIso, emptyMealRecord());
    }
    return buildSummary(dateIso, getOrSeedDay(dateIso));
  },

  // BR-052 (ghi thủ công) và BR-054 (AI Confirm → Save) đều đi qua đây.
  async addLogEntries(
    dateIso: string,
    mealType: MealType,
    inputs: NewMealLogInput[],
  ): Promise<MealLogEntry[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể lưu vào nhật ký, vui lòng thử lại.');
    }

    const day = getOrSeedDay(dateIso);
    const created = inputs.map<MealLogEntry>(input => ({
      id: nextLogId(),
      mealType,
      foodName: input.foodName,
      servingLabel: input.servingLabel,
      grams: input.grams,
      nutrition: input.nutrition,
      nutritionPerGram: nutritionPerGram(input.nutrition, input.grams),
      source: input.source,
      aiConfirmed: input.aiConfirmed,
      loggedAt: new Date().toISOString(),
    }));
    day[mealType] = [...day[mealType], ...created];
    return created;
  },

  // BR-053 — sửa khối lượng/bữa/thời gian, dinh dưỡng tính lại từ nutritionPerGram gốc.
  async updateLogEntry(
    dateIso: string,
    entryId: string,
    patch: { grams?: number; mealType?: MealType },
  ): Promise<MealLogEntry> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể lưu thay đổi, vui lòng thử lại.');
    }

    const day = getOrSeedDay(dateIso);
    const sourceMealType = MEAL_TYPES.find(type => day[type].some(entry => entry.id === entryId));
    if (!sourceMealType) {
      throw new Error('Không tìm thấy bản ghi để sửa.');
    }
    const existing = day[sourceMealType].find(entry => entry.id === entryId);
    if (!existing) {
      throw new Error('Không tìm thấy bản ghi để sửa.');
    }

    const nextGrams = patch.grams ?? existing.grams;
    const nextMealType = patch.mealType ?? existing.mealType;
    const updated: MealLogEntry = {
      ...existing,
      grams: nextGrams,
      mealType: nextMealType,
      servingLabel: `${nextGrams} g`,
      nutrition: {
        calories: Math.round(existing.nutritionPerGram.calories * nextGrams),
        proteinG: Math.round(existing.nutritionPerGram.proteinG * nextGrams),
        carbsG: Math.round(existing.nutritionPerGram.carbsG * nextGrams),
        fatG: Math.round(existing.nutritionPerGram.fatG * nextGrams),
        sugarG: Math.round((existing.nutritionPerGram.sugarG ?? 0) * nextGrams),
        sodiumMg: Math.round((existing.nutritionPerGram.sodiumMg ?? 0) * nextGrams),
        fiberG: Math.round((existing.nutritionPerGram.fiberG ?? 0) * nextGrams),
      },
    };

    day[sourceMealType] = day[sourceMealType].filter(entry => entry.id !== entryId);
    day[nextMealType] = [...day[nextMealType], updated];
    return updated;
  },

  async deleteLogEntry(dateIso: string, entryId: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể xóa, vui lòng thử lại.');
    }

    const day = getOrSeedDay(dateIso);
    MEAL_TYPES.forEach(type => {
      day[type] = day[type].filter(entry => entry.id !== entryId);
    });
  },

  // BR-090 — tìm trong food database mock (FoodSearch.dc.html).
  async searchFoods(query: string, filter: FoodSearchFilter): Promise<FoodItem[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tìm kiếm, vui lòng thử lại.');
    }
    if (scenario === 'empty') return [];

    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = (food: FoodItem) =>
      !normalizedQuery || food.name.toLowerCase().includes(normalizedQuery);
    const catalog = [...FOOD_DATABASE_MOCK, ...listUserCreatedFoods()];

    if (filter === 'favorite') {
      return catalog
        .filter(food => favoriteFoodIds.has(food.id) && matchesQuery(food))
        .map(withFavoriteFlag);
    }
    // BR-121 — "Món của tôi" (CreateFoodScreen, Đợt 10): danh sách món user đã tự nhập.
    if (filter === 'mine') {
      return listUserCreatedFoods().filter(matchesQuery).map(withFavoriteFlag);
    }
    if (filter === 'recent' || !normalizedQuery) {
      return FOOD_DATABASE_MOCK.filter(food => RECENT_FOOD_IDS.includes(food.id)).map(
        withFavoriteFlag,
      );
    }
    return catalog.filter(matchesQuery).map(withFavoriteFlag);
  },

  async getFoodById(foodId: string): Promise<FoodItem | undefined> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải chi tiết món ăn.');
    }
    const food = findFoodById(foodId);
    return food ? withFavoriteFlag(food) : undefined;
  },

  // Bật/tắt yêu thích một món; trả trạng thái sau khi đổi (giống POST|DELETE /foods/{id}/favorite).
  async setFoodFavorite(foodId: string, isFavorite: boolean): Promise<boolean> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật yêu thích, vui lòng thử lại.');
    }
    if (isFavorite) favoriteFoodIds.add(foodId);
    else favoriteFoodIds.delete(foodId);
    return isFavorite;
  },

  // BR-121 — CreateFoodScreen: lưu món do user tự nhập (userFoods.ts), gắn isUserCreated=true
  // (không bịa dữ liệu thay Backend, chỉ ghi đúng số user đã nhập).
  async createFood(input: NewFoodInput): Promise<FoodItem> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể lưu món ăn, vui lòng thử lại.');
    }
    return addUserCreatedFood(input);
  },

  // dùng cho ProgressChart.dc.html (react-native-gifted-charts, 7 ngày).
  async getWeeklyProgress(dateIso: string): Promise<WeeklyProgressSummary> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải tiến độ, vui lòng thử lại.');
    }
    const day = scenario === 'empty' ? emptyMealRecord() : getOrSeedDay(dateIso);
    return createWeeklyProgressMock(dateIso, totalCaloriesForDay(day));
  },
};

// BR-271 — DeleteDataScreen: xóa nhật ký ăn uống đã ghi (ngày hôm nay sẽ được seed lại từ đầu ở
// lần đọc kế tiếp — xem getOrSeedDay — giống trạng thái 1 tài khoản mới, xem src/state/resetUserData.ts).
registerUserDataReset('nutritionDiary', () => diaryByDate.clear());
registerUserDataReset('favoriteFoods', () => favoriteFoodIds.clear());
