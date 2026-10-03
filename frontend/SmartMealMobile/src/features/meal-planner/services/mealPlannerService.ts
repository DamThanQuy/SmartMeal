import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { MEAL_TYPES, type MealType } from '@/types/meal.types';
import type {
  DayMealPlan,
  PlannedMealSlot,
  SlotSuggestionOption,
  WeekPlan,
} from '../types/mealPlanner.types';

interface WeeklyMealPlanApiDto {
  startDate: string;
  targetDailyCalories: number;
  days: Array<{
    date: string;
    totalCalories: number;
    meals: Array<PlannedMealApiDto>;
  }>;
}

interface PlannedMealApiDto {
  mealPlanId: string;
  mealType: string;
  recipeId: string;
  recipeTitle: string;
  calories: number;
  cookingTimeMinutes: number;
}

function toApiMealType(mealType: MealType): string {
  return mealType[0].toUpperCase() + mealType.slice(1);
}

function fromApiMealType(value: string): MealType {
  const normalized = value.toLowerCase();
  return MEAL_TYPES.includes(normalized as MealType) ? (normalized as MealType) : 'snack';
}

export function currentWeekStartIso(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function shiftWeek(weekStartIso: string, direction: 1 | -1): string {
  const base = new Date(weekStartIso);
  return format(direction === 1 ? addWeeks(base, 1) : subWeeks(base, 1), 'yyyy-MM-dd');
}

function emptyDayPlan(): DayMealPlan {
  return { breakfast: null, lunch: null, dinner: null, snack: null };
}

function mapMeal(dto: PlannedMealApiDto): PlannedMealSlot {
  return {
    recipeId: dto.recipeId,
    recipeName: dto.recipeTitle,
    durationMinutes: dto.cookingTimeMinutes,
    calories: Math.round(dto.calories),
  };
}

function mapWeek(dto: WeeklyMealPlanApiDto): WeekPlan {
  return {
    weekStartIso: dto.startDate,
    calorieTarget: Math.round(dto.targetDailyCalories),
    days: dto.days.map(day => {
      const meals = emptyDayPlan();
      day.meals.forEach(meal => {
        meals[fromApiMealType(meal.mealType)] = mapMeal(meal);
      });
      return {
        dateIso: day.date,
        meals,
        plannedCalories: Math.round(day.totalCalories),
      };
    }),
  };
}

export const mealPlannerService = {
  async getWeekPlan(weekStartIso: string): Promise<WeekPlan> {
    const response = await request<WeeklyMealPlanApiDto>({
      method: 'GET',
      url: ENDPOINTS.mealPlanner.week,
      params: { startDate: weekStartIso },
    });
    return mapWeek(response);
  },

  async setSlot(
    _weekStartIso: string,
    dateIso: string,
    mealType: MealType,
    recipeId: string,
  ): Promise<PlannedMealSlot> {
    const response = await request<PlannedMealApiDto>({
      method: 'POST',
      url: ENDPOINTS.mealPlanner.assign,
      data: { planDate: dateIso, mealType: toApiMealType(mealType), recipeId },
    });
    return mapMeal(response);
  },

  async autoFillWeek(weekStartIso: string): Promise<WeekPlan> {
    const current = await this.getWeekPlan(weekStartIso);
    const suggestions = await this.getSlotSuggestions();
    let suggestionIndex = 0;
    for (const day of current.days) {
      for (const mealType of ['breakfast', 'lunch', 'dinner'] as MealType[]) {
        if (day.meals[mealType] || suggestions.options.length === 0) continue;
        const suggestion = suggestions.options[suggestionIndex % suggestions.options.length];
        await this.setSlot(weekStartIso, day.dateIso, mealType, suggestion.recipeId);
        suggestionIndex += 1;
      }
    }
    return this.getWeekPlan(weekStartIso);
  },

  async regenerateWeek(weekStartIso: string): Promise<WeekPlan> {
    const response = await request<WeeklyMealPlanApiDto>({
      method: 'POST',
      url: ENDPOINTS.mealPlanner.autoGenerate,
      data: { startDate: weekStartIso, includeSnack: false },
    });
    return mapWeek(response);
  },

  async getSlotSuggestions(): Promise<{ options: SlotSuggestionOption[]; excludedAllergenIds: string[] }> {
    const response = await request<
      Array<{ id: string; title: string; cookTimeMinutes: number; caloriesPerServing: number; tags: string[] }>
    >({
      method: 'GET',
      url: ENDPOINTS.recipes.list,
    });
    return {
      options: response.map(recipe => ({
        recipeId: recipe.id,
        recipeName: recipe.title,
        durationMinutes: recipe.cookTimeMinutes,
        calories: Math.round(recipe.caloriesPerServing),
        reasonLabel: recipe.tags[0] ?? 'Phù hợp mục tiêu hôm nay',
      })),
      excludedAllergenIds: [],
    };
  },
};
