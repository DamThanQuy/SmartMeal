import { request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { getCurrentUserAllergyIds } from '@/state/user/userProfileStore';
import { RECIPE_DATABASE_MOCK } from '../mocks/recipes.mock';
import { mapRecipeDto } from './recipeMapper';
import type {
  CreateCollectionRequest,
  FoodPageApiDto,
  PantrySuggestionRequest,
  RecipeApiDto,
  RecipeCollectionApiDto,
} from '../types/recipe.api.types';
import type { Recipe, RecipeFilters } from '../types/recipe.types';

// API thật là nguồn dữ liệu chính; mock vẫn được giữ làm fixture cho test.

/** BR-101/102 — loại bỏ công thức chứa dị ứng đã khai báo, dùng chung cho Discovery + Fridge. */
export function filterOutUserAllergens(recipes: Recipe[]): {
  allowed: Recipe[];
  excludedAllergenIds: string[];
} {
  const currentUserAllergyIds = getCurrentUserAllergyIds();
  const excludedAllergenIds = new Set<string>();
  const allowed = recipes.filter(recipe => {
    const matched = recipe.allergenIds.filter(id => currentUserAllergyIds.includes(id));
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

async function getFoodAllergyIndex(): Promise<ReadonlyMap<string, string | undefined>> {
  const index = new Map<string, string | undefined>();
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await request<FoodPageApiDto>({
      method: 'GET',
      url: ENDPOINTS.foods.list,
      params: { page, pageSize },
    });
    result.items.forEach(food => index.set(food.id, mapAllergyId(food.allergyId)));
    totalPages = result.totalPages;
    page += 1;
  }

  return index;
}

function mapAllergyId(allergyId: number | null): string | undefined {
  const map: Record<number, string> = {
    1: 'seafood',
    2: 'peanut',
    3: 'dairy',
    4: 'egg',
    5: 'gluten',
    6: 'soy',
    7: 'treeNut',
    8: 'sesame',
  };
  return allergyId == null ? undefined : map[allergyId];
}

export async function mapApiRecipes(dtos: RecipeApiDto[]): Promise<Recipe[]> {
  const allergyIndex = await getFoodAllergyIndex();
  return mapRecipeDtoList(dtos, allergyIndex);
}

function mapRecipeDtoList(dtos: RecipeApiDto[], allergyIndex: ReadonlyMap<string, string | undefined>): Recipe[] {
  return dtos.map(dto => mapRecipeDto(dto, allergyIndex));
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
    const tagMap = {
      eatClean: 'Eat Clean',
      keto: 'Keto',
      vegan: 'Thuần Chay (Vegan)',
      quick: 'Nhanh Gọn (< 15 phút)',
    } as const;
    const response = await request<RecipeApiDto[]>({
      method: 'GET',
      url: ENDPOINTS.recipes.list,
      params: {
        tag: filters.tag ? tagMap[filters.tag as keyof typeof tagMap] : undefined,
        maxCalories: filters.calorie === 'under300' || filters.calorie === '300to500' ? 500 : undefined,
      },
    });
    const mapped = await mapApiRecipes(response);
    const { allowed, excludedAllergenIds } = filterOutUserAllergens(mapped);
    return { recipes: applyFilters(allowed, filters), excludedAllergenIds };
  },

  async getRecipeById(recipeId: string): Promise<Recipe | undefined> {
    const dto = await request<RecipeApiDto>({
      method: 'GET',
      url: ENDPOINTS.recipes.detail(recipeId),
    });
    const [recipe] = await mapApiRecipes([dto]);
    return recipe;
  },

  // BR-080 — Fridge Scanner: đề xuất công thức phù hợp từ nguyên liệu đã xác nhận, vẫn phải
  // qua bộ lọc dị ứng (filterOutUserAllergens) như Discovery.
  async getRecipesForIngredients(availableIngredientNames: string[]): Promise<RecipeMatch[]> {
    const response = await request<RecipeApiDto[]>({
      method: 'POST',
      url: ENDPOINTS.recipes.suggestByPantry,
      data: { availableIngredients: availableIngredientNames } satisfies PantrySuggestionRequest,
    });
    const mapped = await mapApiRecipes(response);
    const { allowed } = filterOutUserAllergens(mapped);
    return allowed
      .map(recipe => ({
        recipe,
        matchedCount: matchIngredientCount(recipe, availableIngredientNames),
        totalIngredients: recipe.ingredients.length,
      }))
      .filter(match => match.matchedCount > 0)
      .sort((a, b) => b.matchedCount / b.totalIngredients - a.matchedCount / a.totalIngredients);
  },

  async getFavoriteRecipes(): Promise<Recipe[]> {
    const response = await request<RecipeApiDto[]>({
      method: 'GET',
      url: ENDPOINTS.recipes.favorites,
    });
    return mapApiRecipes(response);
  },

  async toggleFavorite(recipeId: string): Promise<{ isFavorite: boolean; totalFavorites: number }> {
    return request({
      method: 'POST',
      url: ENDPOINTS.recipes.favorite(recipeId),
    });
  },

  async getCollections(): Promise<RecipeCollectionApiDto[]> {
    return request({
      method: 'GET',
      url: ENDPOINTS.recipes.collections,
    });
  },

  async createCollection(name: string): Promise<RecipeCollectionApiDto> {
    const payload: CreateCollectionRequest = { name, isPublic: false };
    return request({
      method: 'POST',
      url: ENDPOINTS.recipes.collections,
      data: payload,
    });
  },
};
