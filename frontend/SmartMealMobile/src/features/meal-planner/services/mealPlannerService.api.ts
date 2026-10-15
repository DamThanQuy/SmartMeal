import { RECIPE_TAG_OPTIONS, recipeService } from '@/features/recipes';
import { api, ENDPOINTS } from '@/services/api';
import { toApiMealType, type MealType } from '@/types/meal.types';
import type {
  AssignMealPlanRequestDto,
  AutoGeneratePlanRequestDto,
  CompleteMealPlanRequestDto,
  PlannedMealItemDto,
  WeeklyMealPlanDto,
} from '../types/mealPlanner.api.types';
import type { WeekPlanGeneration } from '../types/mealPlanner.types';
import { fromPlannedMealDto, fromWeeklyPlanDto } from './mealPlanner.mapper';

// Bản gọi backend thật cho /mealplanner/* (docs/SmartMeal_API_Contract.md). Dị ứng là ràng buộc của
// server: POST assign từ chối món chứa dị ứng (errors: allergen_conflict), auto-generate không bao giờ
// xếp món dị ứng và báo no_suitable_recipes khi không còn món hợp lệ.

async function generate(weekStartIso: string, keepExisting: boolean, targetDailyCalories?: number): Promise<WeekPlanGeneration> {
  const { data, message } = await api.postWithMessage<WeeklyMealPlanDto, AutoGeneratePlanRequestDto>(
    ENDPOINTS.mealPlanner.autoGenerate,
    {
      startDate: weekStartIso,
      includeSnack: false,
      keepExisting,
      targetDailyCalories: targetDailyCalories && targetDailyCalories > 0 ? targetDailyCalories : undefined,
    },
  );
  return { plan: fromWeeklyPlanDto(data), note: message || undefined };
}

export const mealPlannerApiService = {
  // GET /mealplanner/week?startDate=<Thứ Hai>
  async getWeekPlan(weekStartIso: string) {
    return fromWeeklyPlanDto(
      await api.get<WeeklyMealPlanDto>(ENDPOINTS.mealPlanner.week, { params: { startDate: weekStartIso } }),
    );
  },

  // POST /mealplanner/assign — mỗi (ngày, bữa) một món, gán lại thì thay món.
  async setSlot(_weekStartIso: string, dateIso: string, mealType: MealType, recipeId: string) {
    return fromPlannedMealDto(
      await api.post<PlannedMealItemDto, AssignMealPlanRequestDto>(ENDPOINTS.mealPlanner.assign, {
        planDate: dateIso,
        mealType: toApiMealType(mealType),
        recipeId,
      }),
    );
  },

  async clearSlot(mealPlanId: string) {
    await api.delete<boolean>(ENDPOINTS.mealPlanner.delete(mealPlanId));
  },

  async setCompleted(mealPlanId: string, isCompleted: boolean) {
    await api.patch<PlannedMealItemDto, CompleteMealPlanRequestDto>(ENDPOINTS.mealPlanner.complete(mealPlanId), {
      isCompleted,
    });
  },

  // BR-163 — keepExisting: server chỉ điền ô trống, giữ món người dùng đã chọn.
  async autoFillWeek(weekStartIso: string, targetDailyCalories?: number) {
    return generate(weekStartIso, true, targetDailyCalories);
  },

  async regenerateWeek(weekStartIso: string, targetDailyCalories?: number) {
    return generate(weekStartIso, false, targetDailyCalories);
  },

  // Tab "Gợi ý" của SlotPicker: công thức hợp bữa đang chọn, đã lọc dị ứng (recipeService).
  async getSlotSuggestions(mealType?: MealType) {
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
