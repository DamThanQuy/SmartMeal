import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { CURRENT_USER_DAILY_TARGET } from '@/features/nutrition';
import {
  filterOutUserAllergens,
  RECIPE_DATABASE_MOCK,
  RECIPE_TAG_OPTIONS,
  type Recipe,
} from '@/features/recipes';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { MEAL_TYPES, type MealType } from '@/types/meal.types';
import { WEEK_PLAN_TEMPLATE } from '../mocks/mealPlan.mock';
import type {
  DayMealPlan,
  DayPlanSummary,
  PlannedMealSlot,
  SlotSuggestionOption,
  WeekPlan,
} from '../types/mealPlanner.types';

// TODO: replace mock with real API — "database" dưới đây chỉ là in-memory store mô phỏng
// Backend cho nhánh feat/mock-ui (CLAUDE.md mục 8), theo đúng pattern nutritionService.

export function currentWeekStartIso(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function shiftWeek(weekStartIso: string, direction: 1 | -1): string {
  const base = new Date(weekStartIso);
  const shifted = direction === 1 ? addWeeks(base, 1) : subWeeks(base, 1);
  return format(shifted, 'yyyy-MM-dd');
}

function emptyDayPlan(): DayMealPlan {
  return { breakfast: null, lunch: null, dinner: null, snack: null };
}

function recipeToSlot(recipe: Recipe): PlannedMealSlot {
  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    durationMinutes: recipe.durationMinutes,
    calories: recipe.nutritionPerServing.calories,
  };
}

function findRecipe(recipeId: string): Recipe | undefined {
  return RECIPE_DATABASE_MOCK.find(recipe => recipe.id === recipeId);
}

function dateAtOffset(weekStartIso: string, offset: number): string {
  return format(addDays(new Date(weekStartIso), offset), 'yyyy-MM-dd');
}

const planByWeek = new Map<string, Record<string, DayMealPlan>>();

function getOrSeedWeek(weekStartIso: string): Record<string, DayMealPlan> {
  const existing = planByWeek.get(weekStartIso);
  if (existing) return existing;

  const days: Record<string, DayMealPlan> = {};
  for (let offset = 0; offset < 7; offset += 1) {
    const dateIso = dateAtOffset(weekStartIso, offset);
    const template = WEEK_PLAN_TEMPLATE[offset] ?? {};
    const dayPlan = emptyDayPlan();
    MEAL_TYPES.forEach(mealType => {
      const recipeId = template[mealType];
      const recipe = recipeId ? findRecipe(recipeId) : undefined;
      dayPlan[mealType] = recipe ? recipeToSlot(recipe) : null;
    });
    days[dateIso] = dayPlan;
  }
  planByWeek.set(weekStartIso, days);
  return days;
}

function summaryForDay(dateIso: string, meals: DayMealPlan): DayPlanSummary {
  const plannedCalories = MEAL_TYPES.reduce((sum, type) => sum + (meals[type]?.calories ?? 0), 0);
  return { dateIso, meals, plannedCalories };
}

function buildWeekPlan(weekStartIso: string, days: Record<string, DayMealPlan>): WeekPlan {
  const summaries: DayPlanSummary[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const dateIso = dateAtOffset(weekStartIso, offset);
    summaries.push(summaryForDay(dateIso, days[dateIso] ?? emptyDayPlan()));
  }
  return { weekStartIso, days: summaries, calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget };
}

function reasonLabelForRecipe(recipe: Recipe): string {
  const tagLabel = RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label;
  return tagLabel ?? 'Phù hợp mục tiêu hôm nay';
}

export const mealPlannerService = {
  // BR-160 — kế hoạch 7 ngày (Thứ 2 → CN), mỗi ngày 4 bữa (BR-051).
  async getWeekPlan(weekStartIso: string): Promise<WeekPlan> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải thực đơn tuần, vui lòng thử lại.');
    }
    if (scenario === 'empty') {
      const days: DayPlanSummary[] = [];
      for (let offset = 0; offset < 7; offset += 1) {
        days.push(summaryForDay(dateAtOffset(weekStartIso, offset), emptyDayPlan()));
      }
      return { weekStartIso, days, calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget };
    }

    return buildWeekPlan(weekStartIso, getOrSeedWeek(weekStartIso));
  },

  // Gán 1 công thức cho 1 slot (ngày + bữa), thay thế slot cũ nếu có — design/SlotPicker.dc.html
  // "Thêm vào Bữa tối".
  async setSlot(
    weekStartIso: string,
    dateIso: string,
    mealType: MealType,
    recipeId: string,
  ): Promise<PlannedMealSlot> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể lưu thực đơn, vui lòng thử lại.');
    }

    const recipe = findRecipe(recipeId);
    if (!recipe) {
      throw new Error('Không tìm thấy công thức.');
    }
    const days = getOrSeedWeek(weekStartIso);
    const dayPlan = days[dateIso] ?? emptyDayPlan();
    const slot = recipeToSlot(recipe);
    days[dateIso] = { ...dayPlan, [mealType]: slot };
    return slot;
  },

  // "Gợi ý thực đơn tuần bằng AI" (design/MealPlanner.dc.html) — chỉ điền các slot Sáng/Trưa/Tối
  // còn trống, luôn qua lọc dị ứng bắt buộc (BR-101/102) trước khi gợi ý, không đụng slot đã chọn.
  async autoFillWeek(weekStartIso: string): Promise<WeekPlan> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể gợi ý thực đơn, vui lòng thử lại.');
    }

    const { allowed } = filterOutUserAllergens(RECIPE_DATABASE_MOCK);
    const days = getOrSeedWeek(weekStartIso);
    let cursor = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      const dateIso = dateAtOffset(weekStartIso, offset);
      const dayPlan = days[dateIso] ?? emptyDayPlan();
      (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach(mealType => {
        if (dayPlan[mealType] || allowed.length === 0) return;
        const recipe = allowed[cursor % allowed.length];
        cursor += 1;
        dayPlan[mealType] = recipeToSlot(recipe);
      });
      days[dateIso] = dayPlan;
    }
    return buildWeekPlan(weekStartIso, days);
  },

  // design/SlotPicker.dc.html tab "Gợi ý" — luôn qua lọc dị ứng bắt buộc (BR-101/102) trước
  // khi hiển thị, giống recipeService.getRecommended (Đợt 5).
  async getSlotSuggestions(): Promise<{
    options: SlotSuggestionOption[];
    excludedAllergenIds: string[];
  }> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải gợi ý, vui lòng thử lại.');
    }
    if (scenario === 'empty') {
      return { options: [], excludedAllergenIds: [] };
    }

    const { allowed, excludedAllergenIds } = filterOutUserAllergens(RECIPE_DATABASE_MOCK);
    const options = allowed.map<SlotSuggestionOption>(recipe => ({
      recipeId: recipe.id,
      recipeName: recipe.name,
      durationMinutes: recipe.durationMinutes,
      calories: recipe.nutritionPerServing.calories,
      reasonLabel: reasonLabelForRecipe(recipe),
    }));
    return { options, excludedAllergenIds };
  },
};
