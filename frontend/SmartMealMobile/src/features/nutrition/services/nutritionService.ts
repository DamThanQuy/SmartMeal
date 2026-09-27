import { format } from 'date-fns';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import type { MealType } from '@/types/meal.types';
import { MEAL_TYPES } from '@/types/meal.types';
import { CURRENT_USER_DAILY_TARGET, createTodaySeedEntries } from '../mocks/diary.mock';
import { FOOD_DATABASE_MOCK } from '../mocks/foods.mock';
import { createWeeklyProgressMock } from '../mocks/progress.mock';
import type {
  DiaryDaySummary,
  FoodItem,
  FoodLogSource,
  MealLogEntry,
  NutritionInfo,
  WeeklyProgressSummary,
} from '../types/nutrition.types';
import { nutritionPerGram, sumNutrition } from '../utils/nutritionMath';

// TODO: replace mock with real API — toàn bộ "database" dưới đây chỉ là in-memory store mô
// phỏng Backend cho nhánh feat/mock-ui (CLAUDE.md mục 8). Khi nối API thật, các hàm export
// giữ nguyên chữ ký, chỉ đổi phần thân sang gọi apiClient.

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

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
  return {
    date: dateIso,
    calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget,
    activityCalories: CURRENT_USER_DAILY_TARGET.activityCalories,
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

export interface NewMealLogInput {
  foodName: string;
  servingLabel: string;
  grams: number;
  nutrition: NutritionInfo;
  source: FoodLogSource;
  aiConfirmed?: boolean;
}

export type FoodSearchFilter = 'all' | 'recent' | 'favorite' | 'mine';

const RECENT_FOOD_IDS = ['bun-bo', 'sua-chua'];

export const nutritionService = {
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

  async getLogEntry(dateIso: string, entryId: string): Promise<MealLogEntry | undefined> {
    const day = getOrSeedDay(dateIso);
    return MEAL_TYPES.flatMap(type => day[type]).find(entry => entry.id === entryId);
  },

  // BR-090 — tìm trong food database mock (FoodSearch.dc.html).
  async searchFoods(query: string, filter: FoodSearchFilter): Promise<FoodItem[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tìm kiếm, vui lòng thử lại.');
    }
    if (scenario === 'empty') return [];

    if (filter === 'favorite' || filter === 'mine') {
      // Chưa có luồng lưu yêu thích / tạo món thủ công trong Đợt 3 — trả rỗng để hiện EmptyState.
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (filter === 'recent') {
      return FOOD_DATABASE_MOCK.filter(food => RECENT_FOOD_IDS.includes(food.id));
    }
    if (!normalizedQuery) {
      return FOOD_DATABASE_MOCK.filter(food => RECENT_FOOD_IDS.includes(food.id));
    }
    return FOOD_DATABASE_MOCK.filter(food => food.name.toLowerCase().includes(normalizedQuery));
  },

  async getFoodById(foodId: string): Promise<FoodItem | undefined> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải chi tiết món ăn.');
    }
    return FOOD_DATABASE_MOCK.find(food => food.id === foodId);
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
