import { fromApiMealType } from '@/types/meal.types';
import type { PlannedMealItemDto, WeeklyMealPlanDto } from '../types/mealPlanner.api.types';
import type { DayMealPlan, PlannedMealSlot, WeekPlan } from '../types/mealPlanner.types';

export function emptyDayPlan(): DayMealPlan {
  return { breakfast: null, lunch: null, dinner: null, snack: null };
}

export function fromPlannedMealDto(dto: PlannedMealItemDto): PlannedMealSlot {
  return {
    mealPlanId: dto.mealPlanId,
    recipeId: dto.recipeId,
    recipeName: dto.recipeTitle,
    imageUrl: dto.recipeImageUrl && /^https?:\/\//i.test(dto.recipeImageUrl) ? dto.recipeImageUrl : undefined,
    durationMinutes: dto.cookingTimeMinutes,
    calories: Math.round(dto.calories),
    isCompleted: dto.isCompleted,
  };
}

/** BE trả đúng 7 ngày từ `startDate`; nhãn thứ tính từ ngày ở UI (không dùng `dayOfWeek` tiếng Việt của BE). */
export function fromWeeklyPlanDto(dto: WeeklyMealPlanDto): WeekPlan {
  return {
    weekStartIso: dto.startDate,
    calorieTarget: Math.round(dto.targetDailyCalories),
    days: dto.days.map(day => {
      const meals = emptyDayPlan();
      day.meals.forEach(meal => {
        meals[fromApiMealType(meal.mealType)] = fromPlannedMealDto(meal);
      });
      return { dateIso: day.date, meals, plannedCalories: Math.round(day.totalCalories) };
    }),
  };
}
