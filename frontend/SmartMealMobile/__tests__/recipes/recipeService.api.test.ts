/**
 * recipeService.api: gọi đúng endpoint /recipes/*, dị ứng lọc 2 lớp (BE excludeMyAllergens khi có token +
 * FE lọc lại theo hồ sơ — BR-101/102), lọc cận dưới calo ở FE, 404 → undefined, gợi ý từ tủ lạnh xếp hạng.
 * `api` được mock — không gọi mạng thật.
 */
import type { RecipeApiDto } from '@/features/recipes/types/recipe.api.types';
import { createTestCatalog } from '../../test-utils/metaCatalog';

function recipeDto(overrides: Partial<RecipeApiDto> = {}): RecipeApiDto {
  return {
    id: 'r1',
    title: 'Cơm gạo lứt bò xào',
    description: null,
    imageUrl: null,
    instructions: '1. Xào bò',
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    totalTimeMinutes: 20,
    servings: 1,
    difficulty: 'Easy',
    isPremium: false,
    caloriesPerServing: 450,
    carbsPerServing: 40,
    fatPerServing: 12,
    proteinPerServing: 35,
    tags: [],
    tagCodes: [],
    mealTypes: ['Lunch'],
    allergyIds: [],
    isFavorite: false,
    healthWarnings: [],
    ingredients: [
      {
        ingredientId: 'i1',
        name: 'Thịt bò thăn',
        amount: 150,
        unit: 'g',
        estimatedPriceVnd: 35000,
        allergyIds: [],
      },
    ],
    ...overrides,
  };
}

async function loadService({
  signedIn = true,
  allergyIds = [] as string[],
} = {}) {
  const apiMock = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  const catalog = await createTestCatalog();

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
  }));
  jest.doMock('@/features/health', () => ({
    getMetaCatalog: jest.fn().mockResolvedValue(catalog),
  }));

  const { useAuthStore } =
    require('@/state/auth/authStore') as typeof import('@/state/auth/authStore');
  const { useUserProfileStore } =
    require('@/state/user/userProfileStore') as typeof import('@/state/user/userProfileStore');
  useAuthStore.setState({ isAuthenticated: signedIn });
  useUserProfileStore.setState({ allergyIds });

  const { recipeApiService } =
    require('@/features/recipes/services/recipeService.api') as typeof import('@/features/recipes/services/recipeService.api');
  const { ApiError } = jest.requireActual(
    '@/services/api/errors',
  ) as typeof import('@/services/api/errors');

  return { service: recipeApiService, apiMock, ApiError };
}

describe('getRecommended', () => {
  test('đã đăng nhập → gửi excludeMyAllergens, FE vẫn lọc lại món chứa dị ứng và báo dị ứng đang lọc', async () => {
    const { service, apiMock } = await loadService({
      allergyIds: ['seafood', 'notInCatalog'],
    });
    apiMock.get.mockResolvedValue([
      recipeDto({ id: 'safe' }),
      recipeDto({ id: 'shrimp', title: 'Gỏi cuốn tôm', allergyIds: [1] }),
    ]);

    const result = await service.getRecommended({
      tag: 'eatClean',
      cookTime: '30',
    });

    expect(apiMock.get).toHaveBeenCalledWith('/recipes', {
      params: expect.objectContaining({
        tag: 'eatClean',
        maxCookTimeMinutes: 30,
        excludeMyAllergens: true,
      }),
    });
    expect(result.recipes.map(r => r.id)).toEqual(['safe']);
    expect(result.excludedAllergenIds).toEqual(['seafood']);
  });

  test('khách (chưa đăng nhập) → không gửi excludeMyAllergens, không báo dị ứng', async () => {
    const { service, apiMock } = await loadService({ signedIn: false });
    apiMock.get.mockResolvedValue([recipeDto()]);

    const result = await service.getRecommended();

    expect(
      apiMock.get.mock.calls[0][1].params.excludeMyAllergens,
    ).toBeUndefined();
    expect(result.excludedAllergenIds).toEqual([]);
  });

  test('khoảng 300–500 kcal: BE chỉ có maxCalories nên FE bỏ món dưới 300 kcal', async () => {
    const { service, apiMock } = await loadService();
    apiMock.get.mockResolvedValue([
      recipeDto({ id: 'light', caloriesPerServing: 250 }),
      recipeDto({ id: 'mid', caloriesPerServing: 420 }),
    ]);

    const result = await service.getRecommended({ calorie: '300to500' });

    expect(apiMock.get.mock.calls[0][1].params.maxCalories).toBe(500);
    expect(result.recipes.map(r => r.id)).toEqual(['mid']);
  });
});

describe('getRecipeById', () => {
  test('GET /recipes/{id} → Recipe đã ánh xạ', async () => {
    const { service, apiMock } = await loadService();
    apiMock.get.mockResolvedValue(recipeDto({ id: 'r9', title: 'Phở bò' }));

    const recipe = await service.getRecipeById('r9');

    expect(apiMock.get).toHaveBeenCalledWith('/recipes/r9');
    expect(recipe).toMatchObject({
      id: 'r9',
      name: 'Phở bò',
      durationMinutes: 20,
    });
  });

  test('404 → undefined (màn hiện "không tìm thấy"); lỗi khác ném nguyên', async () => {
    const { service, apiMock, ApiError } = await loadService();
    apiMock.get.mockRejectedValueOnce(
      new ApiError('Không tìm thấy', 'NOT_FOUND', 404),
    );
    await expect(service.getRecipeById('missing')).resolves.toBeUndefined();

    apiMock.get.mockRejectedValueOnce(
      new ApiError('Dịch vụ lỗi', 'UNAVAILABLE', 503),
    );
    await expect(service.getRecipeById('boom')).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
  });
});

describe('getRecipesForIngredients', () => {
  test('POST /recipes/suggest-by-pantry, bỏ món chứa dị ứng rồi xếp theo tỉ lệ nguyên liệu đang có', async () => {
    const { service, apiMock } = await loadService({ allergyIds: ['egg'] });
    apiMock.post.mockResolvedValue([
      recipeDto({
        id: 'omelette',
        allergyIds: [4],
        ingredients: [
          {
            ingredientId: 'e',
            name: 'Trứng gà',
            amount: 2,
            unit: 'quả',
            estimatedPriceVnd: 4000,
            allergyIds: [4],
          },
        ],
      }),
      recipeDto({ id: 'beef' }),
    ]);

    const matches = await service.getRecipesForIngredients(['thit bo']);

    expect(apiMock.post).toHaveBeenCalledWith('/recipes/suggest-by-pantry', {
      availableIngredients: ['thit bo'],
    });
    expect(matches).toEqual([
      expect.objectContaining({ matchedCount: 1, totalIngredients: 1 }),
    ]);
    expect(matches[0].recipe.id).toBe('beef');
  });
});

describe('collections & favorites', () => {
  test('tạo bộ sưu tập cắt khoảng trắng tên; thêm/xóa món gọi đúng endpoint', async () => {
    const { service, apiMock } = await loadService();
    apiMock.post.mockResolvedValueOnce({
      id: 'c1',
      name: 'Bữa sáng',
      description: null,
      coverImageUrl: null,
      recipeCount: 0,
      isPublic: false,
      ownerId: 'u',
      isOwner: true,
      recipes: [],
    });

    await service.createCollection({ name: '  Bữa sáng  ', isPublic: false });
    apiMock.post.mockResolvedValueOnce(true);
    await service.addRecipeToCollection('c1', 'r1');
    apiMock.delete.mockResolvedValueOnce(true);
    await service.removeRecipeFromCollection('c1', 'r1');

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/recipes/collections', {
      name: 'Bữa sáng',
      isPublic: false,
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(
      2,
      '/recipes/collections/c1/items',
      { recipeId: 'r1' },
    );
    expect(apiMock.delete).toHaveBeenCalledWith(
      '/recipes/collections/c1/items/r1',
    );
  });

  test('toggleFavorite trả trạng thái mới của BE; liên kết chia sẻ sai → undefined', async () => {
    const { service, apiMock, ApiError } = await loadService();
    apiMock.post.mockResolvedValueOnce({ isFavorite: true, totalFavorites: 3 });
    apiMock.get.mockRejectedValueOnce(
      new ApiError('Không tìm thấy', 'NOT_FOUND', 404),
    );

    await expect(service.toggleFavorite('r1')).resolves.toEqual({
      isFavorite: true,
      totalFavorites: 3,
    });
    await expect(
      service.getSharedCollection('bad token'),
    ).resolves.toBeUndefined();
    expect(apiMock.get).toHaveBeenCalledWith(
      '/recipes/collections/shared/bad%20token',
    );
  });
});
