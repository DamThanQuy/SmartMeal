import { addDays, format } from 'date-fns';
import { getMockDelayMs, wait } from '@/config/mock';
import { CURRENT_USER_DAILY_TARGET } from '@/features/nutrition';
import { recipeService, RECIPE_TAG_OPTIONS, type Recipe } from '@/features/recipes';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { MEAL_TYPES, type MealType } from '@/types/meal.types';
import { WEEK_PLAN_TEMPLATE } from '../mocks/mealPlan.mock';
import type {
  DayMealPlan,
  DayPlanSummary,
  PlannedMealSlot,
  SlotSuggestionOption,
  WeekPlan,
  WeekPlanGeneration,
} from '../types/mealPlanner.types';
import { emptyDayPlan } from './mealPlanner.mapper';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API) — "database" in-memory mô phỏng backend, đọc công thức qua
// recipeService (bản mock) thay vì import thẳng dữ liệu mẫu của feature recipes.

async function simulate(errorMessage: string): Promise<'success' | 'empty'> {
  const scenario = getCurrentMockScenario();
  await wait(getMockDelayMs(scenario));
  if (scenario === 'error') throw new Error(errorMessage);
  return scenario === 'empty' ? 'empty' : 'success';
}

function dateAtOffset(weekStartIso: string, offset: number): string {
  return format(addDays(new Date(weekStartIso), offset), 'yyyy-MM-dd');
}

function recipeToSlot(recipe: Recipe, dateIso: string, mealType: MealType): PlannedMealSlot {
  return {
    mealPlanId: `${dateIso}:${mealType}`,
    recipeId: recipe.id,
    recipeName: recipe.name,
    imageUrl: recipe.imageUrl,
    durationMinutes: recipe.durationMinutes,
    calories: recipe.nutritionPerServing.calories,
    isCompleted: false,
  };
}

const planByWeek = new Map<string, Record<string, DayMealPlan>>();

async function getOrSeedWeek(weekStartIso: string): Promise<Record<string, DayMealPlan>> {
  const existing = planByWeek.get(weekStartIso);
  if (existing) return existing;

  const days: Record<string, DayMealPlan> = {};
  for (let offset = 0; offset < 7; offset += 1) {
    const dateIso = dateAtOffset(weekStartIso, offset);
    const template = WEEK_PLAN_TEMPLATE[offset] ?? {};
    const dayPlan = emptyDayPlan();
    for (const mealType of MEAL_TYPES) {
      const recipeId = template[mealType];
      const recipe = recipeId ? await recipeService.getRecipeById(recipeId) : undefined;
      dayPlan[mealType] = recipe ? recipeToSlot(recipe, dateIso, mealType) : null;
    }
    days[dateIso] = dayPlan;
  }
  planByWeek.set(weekStartIso, days);
  return days;
}

function buildWeekPlan(weekStartIso: string, days: Record<string, DayMealPlan>): WeekPlan {
  const summaries: DayPlanSummary[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const dateIso = dateAtOffset(weekStartIso, offset);
    const meals = days[dateIso] ?? emptyDayPlan();
    const plannedCalories = MEAL_TYPES.reduce((sum, type) => sum + (meals[type]?.calories ?? 0), 0);
    summaries.push({ dateIso, meals, plannedCalories });
  }
  return { weekStartIso, days: summaries, calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget };
}

function findSlot(mealPlanId: string): { days: Record<string, DayMealPlan>; dateIso: string; mealType: MealType } | null {
  const [dateIso, mealType] = mealPlanId.split(':') as [string, MealType];
  for (const days of planByWeek.values()) {
    if (days[dateIso]?.[mealType]) return { days, dateIso, mealType };
  }
  return null;
}

// Dùng chung cho autoFillWeek (overwrite=false, "Giữ các bữa tôi đã chọn") và regenerateWeek
// (overwrite=true) — chỉ khác đúng 1 điều kiện, cùng một bộ lọc dị ứng (BR-101/102).
async function fillWeek(weekStartIso: string, overwrite: boolean): Promise<WeekPlanGeneration> {
  await simulate('Không thể gợi ý thực đơn, vui lòng thử lại.');
  const { recipes: allowed } = await recipeService.getRecommended({});
  const days = await getOrSeedWeek(weekStartIso);
  let cursor = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const dateIso = dateAtOffset(weekStartIso, offset);
    const dayPlan = days[dateIso] ?? emptyDayPlan();
    (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach(mealType => {
      if ((dayPlan[mealType] && !overwrite) || allowed.length === 0) return;
      dayPlan[mealType] = recipeToSlot(allowed[cursor % allowed.length], dateIso, mealType);
      cursor += 1;
    });
    days[dateIso] = dayPlan;
  }
  return { plan: buildWeekPlan(weekStartIso, days) };
}

export const mealPlannerMockService = {
  // BR-160 — kế hoạch 7 ngày (Thứ 2 → CN), mỗi ngày 4 bữa (BR-051).
  async getWeekPlan(weekStartIso: string): Promise<WeekPlan> {
    if ((await simulate('Không thể tải thực đơn tuần, vui lòng thử lại.')) === 'empty') {
      return buildWeekPlan(weekStartIso, {});
    }
    return buildWeekPlan(weekStartIso, await getOrSeedWeek(weekStartIso));
  },

  // Gán 1 công thức cho 1 ô (ngày + bữa), thay món cũ nếu có — design/SlotPicker.dc.html.
  async setSlot(weekStartIso: string, dateIso: string, mealType: MealType, recipeId: string): Promise<PlannedMealSlot> {
    await simulate('Không thể lưu thực đơn, vui lòng thử lại.');
    const recipe = await recipeService.getRecipeById(recipeId);
    if (!recipe) throw new Error('Không tìm thấy công thức.');
    const days = await getOrSeedWeek(weekStartIso);
    const slot = recipeToSlot(recipe, dateIso, mealType);
    days[dateIso] = { ...(days[dateIso] ?? emptyDayPlan()), [mealType]: slot };
    return slot;
  },

  async clearSlot(mealPlanId: string): Promise<void> {
    await simulate('Không xóa được món, vui lòng thử lại.');
    const found = findSlot(mealPlanId);
    if (found) found.days[found.dateIso] = { ...found.days[found.dateIso], [found.mealType]: null };
  },

  async setCompleted(mealPlanId: string, isCompleted: boolean): Promise<void> {
    await simulate('Không cập nhật được, vui lòng thử lại.');
    const found = findSlot(mealPlanId);
    const slot = found?.days[found.dateIso][found.mealType];
    if (found && slot) found.days[found.dateIso] = { ...found.days[found.dateIso], [found.mealType]: { ...slot, isCompleted } };
  },

  // "Gợi ý thực đơn tuần bằng AI" — chỉ điền ô Sáng/Trưa/Tối còn trống (BR-163 "Giữ các bữa tôi đã chọn").
  async autoFillWeek(weekStartIso: string, _targetDailyCalories?: number): Promise<WeekPlanGeneration> {
    return fillWeek(weekStartIso, false);
  },

  // "Tạo lại toàn bộ tuần" — chỉ chạy khi người dùng CHỦ ĐỘNG chọn (BR-163, không âm thầm ghi đè).
  async regenerateWeek(weekStartIso: string, _targetDailyCalories?: number): Promise<WeekPlanGeneration> {
    return fillWeek(weekStartIso, true);
  },

  // design/SlotPicker.dc.html tab "Gợi ý" — luôn qua lọc dị ứng (recipeService.getRecommended).
  async getSlotSuggestions(mealType?: MealType): Promise<{ options: SlotSuggestionOption[]; excludedAllergenIds: string[] }> {
    const { recipes, excludedAllergenIds } = await recipeService.getRecommended({ mealType });
    return {
      options: recipes.map(recipe => ({
        recipeId: recipe.id,
        recipeName: recipe.name,
        durationMinutes: recipe.durationMinutes,
        calories: recipe.nutritionPerServing.calories,
        reasonLabel: RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label ?? 'Phù hợp mục tiêu hôm nay',
      })),
      excludedAllergenIds,
    };
  },
};

// BR-271 — DeleteDataScreen: xóa thực đơn đã lên (tuần hiện tại được seed lại ở lần đọc kế tiếp).
registerUserDataReset('mealPlan', () => planByWeek.clear());
