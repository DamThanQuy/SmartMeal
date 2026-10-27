import { gamificationService } from '@/features/gamification';
import { nutritionService, todayIso } from '@/features/nutrition';
import { RECIPE_TAG_OPTIONS, recipeService, type Recipe } from '@/features/recipes';
import { getMealTypeForHour, MEAL_TYPES } from '@/types/meal.types';
import type {
  DashboardSummary,
  PetSnippet,
  RecommendedMeal,
} from '../types/dashboard.types';

// Loading/Empty/Error của cả Dashboard đi theo đúng 1 nguồn (nutritionService.getDiaryDay) để nhất
// quán với Diary — không tự thêm delay/scenario riêng ở đây. Gợi ý món lấy từ recipeService (công thức
// thật, đã lọc dị ứng BR-101/102) — không cần endpoint dashboard riêng (báo cáo gap F08).

const RECOMMENDATION_COUNT = 2;

/** Món hợp bữa sắp tới, gần phần calo còn lại của ngày nhất (không vượt quá nếu có món phù hợp). */
export function pickRecommendations(recipes: Recipe[], remainingCalories: number): RecommendedMeal[] {
  const budget = Math.max(remainingCalories, 0);
  return [...recipes]
    .sort((a, b) => {
      const overA = a.nutritionPerServing.calories > budget ? 1 : 0;
      const overB = b.nutritionPerServing.calories > budget ? 1 : 0;
      if (overA !== overB) return overA - overB;
      return Math.abs(budget - a.nutritionPerServing.calories) - Math.abs(budget - b.nutritionPerServing.calories);
    })
    .slice(0, RECOMMENDATION_COUNT)
    .map(recipe => ({
      recipeId: recipe.id,
      name: recipe.name,
      durationMinutes: recipe.durationMinutes,
      calories: recipe.nutritionPerServing.calories,
      tag: RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label ?? '',
      imageUrl: recipe.imageUrl,
    }));
}
function toPetSnippet(
  pet: Awaited<ReturnType<typeof gamificationService.getPetState>>,
): PetSnippet {
  return {
    name: pet.name,
    level: pet.level,
    streakDays: pet.streakDays,
    progressPercent: Math.round((pet.xpIntoLevel / pet.xpPerLevel) * 100),
    message: pet.message,
  };
}

export const dashboardService = {
  // Backend không có endpoint tổng hợp nên Dashboard gom từ nhiều nguồn song song. allSettled: một
  // nguồn phụ lỗi (Bé Mầm, gợi ý món) chỉ làm khối đó biến mất; nhật ký lỗi mới đáng báo lỗi cả màn.
  async getDashboardSummary(): Promise<DashboardSummary> {
    const dateIso = todayIso();
    const [diaryResult, petResult, recipesResult] = await Promise.allSettled([
      nutritionService.getDiaryDay(dateIso),
      gamificationService.getPetState(),
      recipeService.getRecommended({ mealType: getMealTypeForHour(new Date().getHours()) }),
    ]);

    if (diaryResult.status === 'rejected') throw diaryResult.reason;

    const diary = diaryResult.value;
    const consumed = MEAL_TYPES.reduce(
      (sum, mealType) => sum + diary.entriesByMeal[mealType].reduce((mealSum, entry) => mealSum + entry.nutrition.calories, 0),
      0,
    );
    const remaining = diary.calorieTarget - consumed;

    return {
      diary,
      pet:
        petResult.status === 'fulfilled' ? toPetSnippet(petResult.value) : null,
      recommendedMeals:
        recipesResult.status === 'fulfilled' ? pickRecommendations(recipesResult.value.recipes, remaining) : [],
    };
  },
};
