import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { RECIPE_DATABASE_MOCK } from '../mocks/recipes.mock';
import { nextMockCollectionId, useFavoritesStore, type MockCollection } from '../state/favoritesStore';
import type {
  CollectionUpdate,
  FavoriteToggleResult,
  NewCollectionInput,
  Recipe,
  RecipeCollection,
  RecipeFilters,
  RecipeMatch,
  RecommendedRecipes,
} from '../types/recipe.types';
import { applyFilters, filterOutUserAllergens, rankByPantry } from './recipeFilters';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API) — cùng chữ ký với recipeService.api.ts, đọc
// RECIPE_DATABASE_MOCK và "server" giả lập favoritesStore, xử lý MOCK_SCENARIO như các service khác.

async function simulate(errorMessage: string): Promise<'success' | 'empty'> {
  const scenario = getCurrentMockScenario();
  await wait(getMockDelayMs(scenario));
  if (scenario === 'error') throw new Error(errorMessage);
  return scenario === 'empty' ? 'empty' : 'success';
}

function findRecipe(recipeId: string): Recipe | undefined {
  return RECIPE_DATABASE_MOCK.find(recipe => recipe.id === recipeId);
}

function toCollection(collection: MockCollection): RecipeCollection {
  return {
    id: collection.id,
    name: collection.name,
    isPublic: collection.isPublic,
    isOwner: true, // dữ liệu mẫu chỉ có một người dùng
    recipes: collection.recipeIds.map(findRecipe).filter((recipe): recipe is Recipe => Boolean(recipe)),
  };
}

function updateCollection(collectionId: string, change: (collection: MockCollection) => MockCollection): void {
  useFavoritesStore.setState(state => ({
    collections: state.collections.map(collection => (collection.id === collectionId ? change(collection) : collection)),
  }));
}

export const recipeMockService = {
  // BR-090→BR-100 — Discovery: lọc theo dị ứng (bắt buộc) + chế độ ăn/thời gian/calo/bữa (tuỳ chọn).
  async getRecommended(filters: RecipeFilters = {}): Promise<RecommendedRecipes> {
    if ((await simulate('Không thể tải dữ liệu, vui lòng thử lại.')) === 'empty') {
      return { recipes: [], excludedAllergenIds: [] };
    }

    const { allowed, excludedAllergenIds } = filterOutUserAllergens(RECIPE_DATABASE_MOCK);
    return { recipes: applyFilters(allowed, filters), excludedAllergenIds };
  },

  async getRecipeById(recipeId: string): Promise<Recipe | undefined> {
    await simulate('Không thể tải công thức, vui lòng thử lại.');
    return findRecipe(recipeId);
  },

  // BR-080 — Fridge Scanner: đề xuất công thức từ nguyên liệu đã xác nhận, vẫn qua bộ lọc dị ứng.
  async getRecipesForIngredients(availableIngredientNames: string[]): Promise<RecipeMatch[]> {
    await simulate('Không thể tải gợi ý món, vui lòng thử lại.');
    return rankByPantry(filterOutUserAllergens(RECIPE_DATABASE_MOCK).allowed, availableIngredientNames);
  },

  async getFavoriteRecipes(): Promise<Recipe[]> {
    if ((await simulate('Không thể tải món yêu thích, vui lòng thử lại.')) === 'empty') return [];
    return useFavoritesStore
      .getState()
      .favoriteIds.map(findRecipe)
      .filter((recipe): recipe is Recipe => Boolean(recipe));
  },

  async toggleFavorite(recipeId: string): Promise<FavoriteToggleResult> {
    await simulate('Không lưu được món yêu thích, vui lòng thử lại.');
    const current = useFavoritesStore.getState().favoriteIds;
    const isFavorite = !current.includes(recipeId);
    const favoriteIds = isFavorite ? [...current, recipeId] : current.filter(id => id !== recipeId);
    useFavoritesStore.setState({ favoriteIds });
    return { isFavorite, totalFavorites: favoriteIds.length };
  },

  async getCollections(): Promise<RecipeCollection[]> {
    if ((await simulate('Không thể tải bộ sưu tập, vui lòng thử lại.')) === 'empty') return [];
    return useFavoritesStore.getState().collections.map(toCollection);
  },

  async getCollection(collectionId: string): Promise<RecipeCollection | undefined> {
    await simulate('Không thể tải bộ sưu tập, vui lòng thử lại.');
    const collection = useFavoritesStore.getState().collections.find(item => item.id === collectionId);
    return collection ? toCollection(collection) : undefined;
  },

  async createCollection(input: NewCollectionInput): Promise<RecipeCollection> {
    await simulate('Không tạo được bộ sưu tập, vui lòng thử lại.');
    const collection: MockCollection = { id: nextMockCollectionId(), name: input.name, isPublic: input.isPublic, recipeIds: [] };
    useFavoritesStore.setState(state => ({ collections: [collection, ...state.collections] }));
    return toCollection(collection);
  },

  async updateCollection(collectionId: string, update: CollectionUpdate): Promise<RecipeCollection> {
    await simulate('Không lưu được bộ sưu tập, vui lòng thử lại.');
    updateCollection(collectionId, collection => ({
      ...collection,
      name: update.name ?? collection.name,
      isPublic: update.isPublic ?? collection.isPublic,
    }));
    const updated = useFavoritesStore.getState().collections.find(item => item.id === collectionId);
    if (!updated) throw new Error('Không tìm thấy bộ sưu tập.');
    return toCollection(updated);
  },

  async deleteCollection(collectionId: string): Promise<void> {
    await simulate('Không xóa được bộ sưu tập, vui lòng thử lại.');
    useFavoritesStore.setState(state => ({
      collections: state.collections.filter(collection => collection.id !== collectionId),
    }));
  },

  async addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
    await simulate('Không thêm được món vào bộ sưu tập, vui lòng thử lại.');
    updateCollection(collectionId, collection => ({
      ...collection,
      recipeIds: collection.recipeIds.includes(recipeId) ? collection.recipeIds : [...collection.recipeIds, recipeId],
    }));
  },

  async removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<void> {
    await simulate('Không bỏ được món khỏi bộ sưu tập, vui lòng thử lại.');
    updateCollection(collectionId, collection => ({
      ...collection,
      recipeIds: collection.recipeIds.filter(id => id !== recipeId),
    }));
  },
};
