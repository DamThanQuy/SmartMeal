/**
 * recipe.mapper: DTO /recipes/* → Recipe/RecipeCollection (dị ứng & tag theo code của /meta, bữa,
 * ảnh, các bước) và bộ lọc FE → tham số GET /recipes.
 */
import type { MetaCatalog } from '@/features/health';
import {
  fromCollectionDto,
  fromRecipeDto,
  parseInstructions,
  toRecipeQueryParams,
} from '@/features/recipes/services/recipe.mapper';
import type { RecipeApiDto } from '@/features/recipes/types/recipe.api.types';
import { createTestCatalog } from '../../test-utils/metaCatalog';

function recipeDto(overrides: Partial<RecipeApiDto> = {}): RecipeApiDto {
  return {
    id: '7b1c2d3e-0000-4000-8000-000000000001',
    title: 'Cá hồi áp chảo',
    description: 'Cá hồi giàu omega-3',
    imageUrl: 'https://img.example/ca-hoi.jpg',
    instructions: '1. Ướp cá\n\n2) Áp chảo 5 phút\nBày ra đĩa',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    servings: 2,
    difficulty: 'Easy',
    isPremium: false,
    caloriesPerServing: 450.4,
    carbsPerServing: 8.6,
    fatPerServing: 28.2,
    proteinPerServing: 35.5,
    tags: ['Tăng Cơ (High Protein)', 'Eat Clean'],
    tagCodes: ['highProtein', 'eatClean'],
    mealTypes: ['Lunch', 'dinner', 'Brunch'],
    allergyIds: [1],
    isFavorite: true,
    healthWarnings: ['Nhiều chất béo'],
    ingredients: [
      { ingredientId: 'i1', name: 'Cá hồi', amount: 200, unit: 'g', estimatedPriceVnd: 65000, allergyIds: [1] },
      { ingredientId: 'i2', name: 'Măng tây', amount: 100.25, unit: 'g', estimatedPriceVnd: 20000, allergyIds: [] },
      { ingredientId: 'i3', name: 'Nước tương', amount: 1, unit: 'muỗng', estimatedPriceVnd: 0, allergyIds: [6, 99] },
    ],
    ...overrides,
  };
}

describe('recipe.mapper', () => {
  let catalog: MetaCatalog;

  beforeAll(async () => {
    catalog = await createTestCatalog();
  });

  test('dị ứng và tag ánh xạ theo code, chỉ giữ tag FE biết, bữa hợp lệ, số làm tròn', () => {
    const recipe = fromRecipeDto(recipeDto(), catalog);

    expect(recipe.allergenIds).toEqual(['seafood']);
    expect(recipe.ingredients.map(i => i.allergenIds)).toEqual([['seafood'], [], ['soy']]);
    expect(recipe.tags).toEqual(['eatClean']);
    expect(recipe.mealTypes).toEqual(['lunch', 'dinner']);
    expect(recipe.nutritionPerServing).toEqual({ calories: 450, proteinG: 36, carbsG: 9, fatG: 28 });
    expect(recipe.durationMinutes).toBe(25);
    expect(recipe.ingredients[1].amount).toBe('100.3 g');
    expect(recipe.healthWarnings).toEqual(['Nhiều chất béo']);
    expect(recipe.rating).toBeUndefined();
  });

  test('chỉ nhận ảnh URL tuyệt đối; tách các bước và bỏ tiền tố số', () => {
    expect(fromRecipeDto(recipeDto({ imageUrl: '/uploads/a.jpg' }), catalog).imageUrl).toBeUndefined();
    expect(fromRecipeDto(recipeDto(), catalog).imageUrl).toBe('https://img.example/ca-hoi.jpg');
    expect(parseInstructions('1. Ướp cá\n\n2) Áp chảo 5 phút\nBày ra đĩa')).toEqual([
      { order: 1, instruction: 'Ướp cá' },
      { order: 2, instruction: 'Áp chảo 5 phút' },
      { order: 3, instruction: 'Bày ra đĩa' },
    ]);
  });

  test('bộ sưu tập giữ quyền sở hữu và chế độ chia sẻ', () => {
    const collection = fromCollectionDto(
      {
        id: 'c1',
        name: 'Món giảm cân',
        description: null,
        coverImageUrl: null,
        recipeCount: 1,
        isPublic: true,
        ownerId: 'u2',
        isOwner: false,
        recipes: [recipeDto()],
      },
      catalog,
    );

    expect(collection).toMatchObject({ id: 'c1', isPublic: true, isOwner: false, shareToken: null });
    expect(collection.recipes[0].allergenIds).toEqual(['seafood']);
  });

  test('chủ sở hữu thấy mã liên kết chia sẻ đang bật', () => {
    const collection = fromCollectionDto(
      {
        id: 'c2',
        name: 'Món tuần này',
        description: null,
        coverImageUrl: null,
        recipeCount: 0,
        isPublic: false,
        ownerId: 'u1',
        isOwner: true,
        shareToken: 'Abc_123-xyz',
        recipes: [],
      },
      catalog,
    );

    expect(collection).toMatchObject({ isPublic: false, isOwner: true, shareToken: 'Abc_123-xyz' });
  });

  test('bộ lọc → tham số GET /recipes; chỉ yêu cầu loại dị ứng khi đã đăng nhập', () => {
    expect(toRecipeQueryParams({ tag: 'keto', calorie: 'under300', cookTime: '30', mealType: 'breakfast' }, true)).toEqual({
      tag: 'keto',
      maxCalories: 299,
      maxCookTimeMinutes: 30,
      mealType: 'Breakfast',
      excludeMyAllergens: true,
    });
    expect(toRecipeQueryParams({ calorie: '300to500' }, false)).toMatchObject({ maxCalories: 500, excludeMyAllergens: undefined });
    expect(toRecipeQueryParams({ calorie: 'over500' }, true).maxCalories).toBeUndefined();
  });
});

describe('recipeService.api — liên kết chia sẻ bộ sưu tập', () => {
  function load() {
    const apiMock = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
    jest.resetModules();
    jest.doMock('@/services/api', () => ({
      api: apiMock,
      ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
      isApiError: jest.requireActual('@/services/api/errors').isApiError,
    }));
    jest.doMock('@/features/health', () => ({ getMetaCatalog: jest.fn().mockResolvedValue(createTestCatalog()) }));
    const { recipeApiService } =
      require('@/features/recipes/services/recipeService.api') as typeof import('@/features/recipes/services/recipeService.api');
    const errors = jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');
    return { service: recipeApiService, apiMock, ApiError: errors.ApiError };
  }

  test('bật / tắt liên kết gọi đúng endpoint của chủ sở hữu', async () => {
    const { service, apiMock } = load();
    apiMock.post.mockResolvedValue({ shareToken: 'tok_1', sharedAt: '2026-10-14T01:00:00Z' });
    apiMock.delete.mockResolvedValue(true);

    await expect(service.createCollectionShareLink?.('c1')).resolves.toEqual({
      shareToken: 'tok_1',
      sharedAtIso: '2026-10-14T01:00:00Z',
    });
    await service.revokeCollectionShareLink?.('c1');

    expect(apiMock.post).toHaveBeenCalledWith('/recipes/collections/c1/share');
    expect(apiMock.delete).toHaveBeenCalledWith('/recipes/collections/c1/share');
  });

  test('mở liên kết: đọc bộ sưu tập theo mã; liên kết đã tắt (404) → undefined', async () => {
    const { service, apiMock, ApiError } = load();
    apiMock.get.mockResolvedValueOnce({
      id: 'c1',
      name: 'Món tuần này',
      description: null,
      coverImageUrl: null,
      recipeCount: 0,
      isPublic: false,
      ownerId: 'u1',
      isOwner: false,
      shareToken: null,
      recipes: [],
    });

    await expect(service.getSharedCollection?.('tok_1')).resolves.toMatchObject({ id: 'c1', isOwner: false });
    expect(apiMock.get).toHaveBeenCalledWith('/recipes/collections/shared/tok_1');

    apiMock.get.mockRejectedValueOnce(new ApiError('Liên kết chia sẻ không tồn tại hoặc đã bị tắt.', 'NOT_FOUND', 404));
    await expect(service.getSharedCollection?.('tok_old')).resolves.toBeUndefined();
  });
});
