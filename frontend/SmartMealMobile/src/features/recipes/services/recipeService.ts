import { CURRENT_USER_ALLERGY_IDS } from '@/features/nutrition';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { RECIPE_DATABASE_MOCK } from '../mocks/recipes.mock';
import type { Recipe, RecipeFilters } from '../types/recipe.types';

// TODO: replace mock with real API.

/** BR-101/102 — loại bỏ công thức chứa dị ứng đã khai báo, dùng chung cho Discovery + Fridge. */
export function filterOutUserAllergens(recipes: Recipe[]): {
  allowed: Recipe[];
  excludedAllergenIds: string[];
} {
  const excludedAllergenIds = new Set<string>();
  const allowed = recipes.filter(recipe => {
    const matched = recipe.allergenIds.filter(id => CURRENT_USER_ALLERGY_IDS.includes(id));
    matched.forEach(id => excludedAllergenIds.add(id));
    return matched.length === 0;
  });
  return { allowed, excludedAllergenIds: Array.from(excludedAllergenIds) };
}

function applyFilters(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  return recipes.filter(recipe => {
    if (filters.tag && !recipe.tags.includes(filters.tag)) return false;
    if (filters.cookTime) {
      const maxMinutes = Number(filters.cookTime);
      if (recipe.durationMinutes > maxMinutes) return false;
    }
    if (filters.calorie) {
      const calories = recipe.nutritionPerServing.calories;
      if (filters.calorie === 'under300' && calories >= 300) return false;
      if (filters.calorie === '300to500' && (calories < 300 || calories > 500)) return false;
      if (filters.calorie === 'over500' && calories <= 500) return false;
    }
    return true;
  });
}

function matchIngredientCount(recipe: Recipe, availableIngredientNames: string[]): number {
  const normalizedAvailable = availableIngredientNames.map(name => name.toLowerCase());
  return recipe.ingredients.filter(ingredient =>
    normalizedAvailable.some(
      available =>
        ingredient.name.toLowerCase().includes(available) ||
        available.includes(ingredient.name.toLowerCase()),
    ),
  ).length;
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedCount: number;
  totalIngredients: number;
}

export const recipeService = {
  // BR-090→BR-100 — Discovery: lọc theo dị ứng (bắt buộc) + chế độ ăn/thời gian/calo (tuỳ chọn).
  async getRecommended(
    filters: RecipeFilters = {},
  ): Promise<{ recipes: Recipe[]; excludedAllergenIds: string[] }> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải dữ liệu, vui lòng thử lại.');
    }
    if (scenario === 'empty') {
      return { recipes: [], excludedAllergenIds: [] };
    }

    const { allowed, excludedAllergenIds } = filterOutUserAllergens(RECIPE_DATABASE_MOCK);
    return { recipes: applyFilters(allowed, filters), excludedAllergenIds };
  },

  async getRecipeById(recipeId: string): Promise<Recipe | undefined> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải công thức, vui lòng thử lại.');
    }
    return RECIPE_DATABASE_MOCK.find(recipe => recipe.id === recipeId);
  },

  // BR-080 — Fridge Scanner: đề xuất công thức phù hợp từ nguyên liệu đã xác nhận, vẫn phải
  // qua bộ lọc dị ứng (filterOutUserAllergens) như Discovery.
  async getRecipesForIngredients(availableIngredientNames: string[]): Promise<RecipeMatch[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải gợi ý món, vui lòng thử lại.');
    }

    const { allowed } = filterOutUserAllergens(RECIPE_DATABASE_MOCK);
    return allowed
      .map(recipe => ({
        recipe,
        matchedCount: matchIngredientCount(recipe, availableIngredientNames),
        totalIngredients: recipe.ingredients.length,
      }))
      .filter(match => match.matchedCount > 0)
      .sort((a, b) => b.matchedCount / b.totalIngredients - a.matchedCount / a.totalIngredients);
  },
};
