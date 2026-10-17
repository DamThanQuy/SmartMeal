import { getMetaCatalog } from '@/features/health';
import { api, ENDPOINTS, isApiError } from '@/services/api';
import { useAuthStore } from '@/state/auth/authStore';
import { getCurrentUserAllergyIds } from '@/state/user/userProfileStore';
import type {
  AddRecipeToCollectionRequest,
  CollectionShareApiDto,
  CreateCollectionRequest,
  FavoriteToggleApiDto,
  PantrySuggestionRequest,
  RecipeApiDto,
  RecipeCollectionApiDto,
  UpdateCollectionRequest,
} from '../types/recipe.api.types';
import type {
  CollectionShareLink,
  CollectionUpdate,
  FavoriteToggleResult,
  NewCollectionInput,
  Recipe,
  RecipeCollection,
  RecipeFilters,
  RecommendedRecipes,
} from '../types/recipe.types';
import { fromCollectionDto, fromRecipeDto, toRecipeQueryParams } from './recipe.mapper';
import { filterOutUserAllergens, matchesCalorieFilter, rankByPantry } from './recipeFilters';

// Bản gọi backend thật cho /recipes/* (docs/SmartMeal_API_Contract.md). Dị ứng là ràng buộc bắt buộc
// (BR-101/102): BE loại món khi có token (excludeMyAllergens) và FE lọc lại lần nữa theo hồ sơ đang có
// — thiếu danh mục dị ứng (/meta) thì cả danh sách báo lỗi, không bao giờ hiện danh sách chưa lọc.

function isSignedIn(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

async function toRecipes(dtos: RecipeApiDto[]): Promise<Recipe[]> {
  const catalog = await getMetaCatalog();
  return dtos.map(dto => fromRecipeDto(dto, catalog));
}

async function orUndefinedWhenMissing<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch (error) {
    if (isApiError(error) && error.code === 'NOT_FOUND') return undefined;
    throw error;
  }
}

export const recipeApiService = {
  // GET /recipes?tag&maxCalories&mealType&maxCookTimeMinutes&excludeMyAllergens
  async getRecommended(filters: RecipeFilters = {}): Promise<RecommendedRecipes> {
    const signedIn = isSignedIn();
    const [dtos, catalog] = await Promise.all([
      api.get<RecipeApiDto[]>(ENDPOINTS.recipes.list, { params: toRecipeQueryParams(filters, signedIn) }),
      getMetaCatalog(),
    ]);
    const { allowed } = filterOutUserAllergens(dtos.map(dto => fromRecipeDto(dto, catalog)));
    return {
      recipes: allowed.filter(recipe => matchesCalorieFilter(recipe, filters.calorie)),
      // BE đã loại món theo hồ sơ → ghi rõ những dị ứng đang được dùng để lọc (chỉ mục BE biết).
      excludedAllergenIds: signedIn ? getCurrentUserAllergyIds().filter(id => catalog.allergies.hasCode(id)) : [],
    };
  },

  // GET /recipes/{id} — 404 (id không tồn tại/không phải GUID) → undefined để màn hiện "không tìm thấy".
  async getRecipeById(recipeId: string) {
    const dto = await orUndefinedWhenMissing(() => api.get<RecipeApiDto>(ENDPOINTS.recipes.detail(recipeId)));
    if (!dto) return undefined;
    const [recipe] = await toRecipes([dto]);
    return recipe;
  },

  // POST /recipes/suggest-by-pantry — BE loại món dị ứng khi có token; FE lọc lại và tính số nguyên liệu khớp.
  async getRecipesForIngredients(availableIngredientNames: string[]) {
    const dtos = await api.post<RecipeApiDto[], PantrySuggestionRequest>(ENDPOINTS.recipes.suggestByPantry, {
      availableIngredients: availableIngredientNames,
    });
    const { allowed } = filterOutUserAllergens(await toRecipes(dtos));
    return rankByPantry(allowed, availableIngredientNames);
  },

  async getFavoriteRecipes() {
    return toRecipes(await api.get<RecipeApiDto[]>(ENDPOINTS.recipes.favorites));
  },

  // POST /recipes/{id}/favorite — TOGGLE, trả trạng thái mới.
  async toggleFavorite(recipeId: string): Promise<FavoriteToggleResult> {
    return api.post<FavoriteToggleApiDto>(ENDPOINTS.recipes.favorite(recipeId));
  },

  // GET /recipes/collections — của mình + công khai của người khác; `isOwner` quyết định quyền sửa (BR-152).
  async getCollections() {
    const [dtos, catalog] = await Promise.all([
      api.get<RecipeCollectionApiDto[]>(ENDPOINTS.recipes.collections),
      getMetaCatalog(),
    ]);
    return dtos.map(dto => fromCollectionDto(dto, catalog));
  },

  async getCollection(collectionId: string) {
    const dto = await orUndefinedWhenMissing(() =>
      api.get<RecipeCollectionApiDto>(ENDPOINTS.recipes.collection(collectionId)),
    );
    if (!dto) return undefined;
    return fromCollectionDto(dto, await getMetaCatalog());
  },

  async createCollection(input: NewCollectionInput): Promise<RecipeCollection> {
    const dto = await api.post<RecipeCollectionApiDto, CreateCollectionRequest>(ENDPOINTS.recipes.collections, {
      name: input.name.trim(),
      isPublic: input.isPublic,
    });
    return fromCollectionDto(dto, await getMetaCatalog());
  },

  // PATCH /recipes/collections/{id} — chỉ chủ sở hữu (403 với người khác).
  async updateCollection(collectionId: string, update: CollectionUpdate): Promise<RecipeCollection> {
    const dto = await api.patch<RecipeCollectionApiDto, UpdateCollectionRequest>(
      ENDPOINTS.recipes.collection(collectionId),
      { name: update.name?.trim(), isPublic: update.isPublic },
    );
    return fromCollectionDto(dto, await getMetaCatalog());
  },

  async deleteCollection(collectionId: string) {
    await api.delete<boolean>(ENDPOINTS.recipes.collection(collectionId));
  },

  async addRecipeToCollection(collectionId: string, recipeId: string) {
    await api.post<boolean, AddRecipeToCollectionRequest>(ENDPOINTS.recipes.collectionItems(collectionId), { recipeId });
  },

  async removeRecipeFromCollection(collectionId: string, recipeId: string) {
    await api.delete<boolean>(ENDPOINTS.recipes.collectionItem(collectionId, recipeId));
  },

  // POST /recipes/collections/{id}/share — bật liên kết chỉ đọc (đã bật thì trả lại mã cũ); bộ sưu tập vẫn riêng tư.
  async createCollectionShareLink(collectionId: string): Promise<CollectionShareLink> {
    const dto = await api.post<CollectionShareApiDto>(ENDPOINTS.recipes.collectionShare(collectionId));
    return { shareToken: dto.shareToken, sharedAtIso: dto.sharedAt };
  },

  // DELETE /recipes/collections/{id}/share — liên kết cũ không mở được nữa.
  async revokeCollectionShareLink(collectionId: string): Promise<void> {
    await api.delete<boolean>(ENDPOINTS.recipes.collectionShare(collectionId));
  },

  // GET /recipes/collections/shared/{token} — chỉ đọc; mã sai hoặc đã tắt → undefined (404).
  async getSharedCollection(shareToken: string): Promise<RecipeCollection | undefined> {
    const dto = await orUndefinedWhenMissing(() =>
      api.get<RecipeCollectionApiDto>(ENDPOINTS.recipes.sharedCollection(shareToken)),
    );
    if (!dto) return undefined;
    return fromCollectionDto(dto, await getMetaCatalog());
  },
};
