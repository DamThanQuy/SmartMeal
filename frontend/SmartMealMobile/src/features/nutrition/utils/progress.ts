import { MEAL_TYPE_OPTIONS, MEAL_TYPES } from '@/types/meal.types';
import type { DayProgressSummary, DiaryDaySummary } from '../types/nutrition.types';
import { sumNutrition } from './nutritionMath';

/**
 * Tab "Ngày" của ProgressChart: calo từng bữa + macro so với mục tiêu, tính từ đúng nhật ký của
 * ngày đó (không cần API riêng). Ngân sách calo = mục tiêu calo của ngày, như Dashboard/Diary.
 */
export function buildDayProgress(diary: DiaryDaySummary): DayProgressSummary {
  const meals = MEAL_TYPES.map(mealType => ({
    mealType,
    label: MEAL_TYPE_OPTIONS.find(option => option.id === mealType)?.label ?? mealType,
    calories: Math.round(
      diary.entriesByMeal[mealType].reduce((sum, entry) => sum + entry.nutrition.calories, 0),
    ),
  }));
  const total = sumNutrition(MEAL_TYPES.flatMap(mealType => diary.entriesByMeal[mealType].map(entry => entry.nutrition)));

  return {
    calorieBudget: Math.round(diary.calorieTarget),
    totalCalories: meals.reduce((sum, meal) => sum + meal.calories, 0),
    meals,
    macros: [
      { label: 'Protein', consumedG: Math.round(total.proteinG), targetG: Math.round(diary.macroTargets.proteinG) },
      { label: 'Carbs', consumedG: Math.round(total.carbsG), targetG: Math.round(diary.macroTargets.carbsG) },
      { label: 'Fat', consumedG: Math.round(total.fatG), targetG: Math.round(diary.macroTargets.fatG) },
    ],
  };
}
