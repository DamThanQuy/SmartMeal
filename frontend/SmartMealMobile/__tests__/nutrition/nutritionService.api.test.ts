/**
 * nutritionService.api (docs/fetch-api/part1 §7): gọi đúng endpoint BE — ghi cả bữa trong MỘT
 * request, sửa món bằng PUT, tìm món theo scope, yêu thích, món tự nhập, tiến độ tuần kèm macro.
 * `api` được mock — không gọi mạng thật.
 */
import type {
  DailyDiarySummaryDto,
  DiaryItemDto,
  FoodItemDto,
  WeeklyProgressDto,
} from '@/features/nutrition/types/nutrition.api.types';
import type { NewMealLogInput } from '@/features/nutrition/types/nutrition.types';

function item(overrides: Partial<DiaryItemDto> = {}): DiaryItemDto {
  return {
    id: 'item-1',
    foodName: 'Phở bò tái',
    servingSize: 500,
    unit: 'g',
    calories: 450,
    carbsGrams: 55,
    fatGrams: 12,
    proteinGrams: 25,
    logMethod: 'Manual',
    mealType: 'Lunch',
    logDate: '2026-10-02',
    createdAt: '2026-10-02T05:30:00Z',
    recipeId: null,
    ingredientId: null,
    imageUrl: null,
    ...overrides,
  };
}

const DAILY_DTO: DailyDiarySummaryDto = {
  date: '2026-10-02',
  totalCalories: 450,
  totalCarbs: 55,
  totalFat: 12,
  totalProtein: 25,
  targetCalories: 1776,
  targetCarbs: 222,
  targetFat: 49,
  targetProtein: 111,
  meals: [
    { mealType: 'Breakfast', subtotalCalories: 0, items: [] },
    { mealType: 'Lunch', subtotalCalories: 450, items: [item()] },
    { mealType: 'Dinner', subtotalCalories: 0, items: [] },
    { mealType: 'Snack', subtotalCalories: 0, items: [] },
  ],
};

function input(foodName: string, grams = 100, extra: Partial<NewMealLogInput> = {}): NewMealLogInput {
  return {
    foodName,
    servingLabel: `${grams} g`,
    grams,
    nutrition: { calories: grams, proteinG: 10, carbsG: 20, fatG: 5 },
    source: 'manual',
    ...extra,
  };
}

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
  const healthSyncMock = { getDailySummary: jest.fn() };
  const includeActivity = { value: true };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/features/nutrition/services/healthSyncService', () => ({
    healthSyncService: healthSyncMock,
  }));
  jest.doMock('@/state/user/userProfileStore', () => ({
    getIncludeActivityCalories: () => includeActivity.value,
  }));
  // Danh mục dị ứng theo code như dữ liệu seed của BE.
  const allergyCodes: Record<number, string> = {
    1: 'seafood',
    2: 'peanut',
    3: 'dairy',
    4: 'egg',
    5: 'gluten',
    6: 'soy',
    7: 'treeNut',
    8: 'sesame',
  };
  jest.doMock('@/features/health', () => ({
    getMetaCatalog: jest.fn(async () => ({
      allergies: { codeById: (id: number) => allergyCodes[id] },
    })),
  }));

  const { nutritionApiService } =
    require('@/features/nutrition/services/nutritionService.api') as typeof import('@/features/nutrition/services/nutritionService.api');
  // Cùng registry với service để instanceof đúng sau jest.resetModules().
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return { service: nutritionApiService, apiMock, healthSyncMock, includeActivity, ApiError };
}

describe('getDiaryDay', () => {
  test('GET /nutritiondiary/daily?date= và GET /health-sync/daily-summary cùng ngày, cộng calo vận động', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    apiMock.get.mockResolvedValue(DAILY_DTO);
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 180 });

    const diary = await service.getDiaryDay?.('2026-10-02');

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/daily', {
      params: { date: '2026-10-02' },
    });
    expect(healthSyncMock.getDailySummary).toHaveBeenCalledWith('2026-10-02');
    expect(diary).toMatchObject({
      date: '2026-10-02',
      calorieTarget: 1776,
      activityCalories: 180,
    });
    expect(diary?.entriesByMeal.lunch).toHaveLength(1);
    // Giờ ghi lấy từ createdAt do BE lưu (không còn để trống).
    expect(diary?.entriesByMeal.lunch[0].loggedAt).toBe('2026-10-02T05:30:00.000Z');
  });

  test('tắt công tắc "Cộng calo vận động" → activityCalories = 0', async () => {
    const { service, apiMock, healthSyncMock, includeActivity } = loadService();
    includeActivity.value = false;
    apiMock.get.mockResolvedValue(DAILY_DTO);
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 180 });

    const diary = await service.getDiaryDay?.('2026-10-02');

    expect(diary?.activityCalories).toBe(0);
  });

  test('lấy calo vận động lỗi → coi là 0, nhật ký vẫn hiện', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    apiMock.get.mockResolvedValue(DAILY_DTO);
    healthSyncMock.getDailySummary.mockRejectedValue(new Error('mất mạng'));

    const diary = await service.getDiaryDay?.('2026-10-02');

    expect(diary?.activityCalories).toBe(0);
    expect(diary?.calorieTarget).toBe(1776);
  });

  test('nhật ký lỗi → ném lỗi (màn hình hiện ErrorState)', async () => {
    const { service, apiMock, healthSyncMock, ApiError } = loadService();
    const error = new ApiError('Máy chủ gặp sự cố.', 'SERVER', 500);
    apiMock.get.mockRejectedValue(error);
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 0 });

    await expect(service.getDiaryDay?.('2026-10-02')).rejects.toBe(error);
  });
});

describe('addLogEntries', () => {
  test('cả bữa trong MỘT request POST /nutritiondiary/log/batch, trả các bản ghi đã tạo kèm giờ ghi', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue([
      item({ id: 'a', foodName: 'Cơm', servingSize: 150 }),
      item({ id: 'b', foodName: 'Gà kho', servingSize: 120 }),
      item({ id: 'c', foodName: 'Canh', servingSize: 200 }),
    ]);

    const created = await service.addLogEntries?.('2026-10-02', 'lunch', [
      input('Cơm', 150),
      input('Gà kho', 120),
      input('Canh', 200),
    ]);

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).toHaveBeenCalledWith('/nutritiondiary/log/batch', {
      logDate: '2026-10-02',
      mealType: 'Lunch',
      items: [
        expect.objectContaining({ foodName: 'Cơm', servingSize: 150, unit: 'g', logMethod: 'Manual' }),
        expect.objectContaining({ foodName: 'Gà kho', servingSize: 120 }),
        expect.objectContaining({ foodName: 'Canh', servingSize: 200 }),
      ],
    });
    expect(created?.map(entry => entry.id)).toEqual(['a', 'b', 'c']);
    expect(created?.every(entry => entry.mealType === 'lunch')).toBe(true);
    expect(created?.every(entry => typeof entry.loggedAt === 'string')).toBe(true);
  });

  test('món lấy từ danh mục mang theo id thực phẩm', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue([item()]);

    await service.addLogEntries?.('2026-10-02', 'lunch', [
      input('Ức gà', 150, { ingredientId: 'ing-1', source: 'database' }),
    ]);

    expect(apiMock.post.mock.calls[0][1].items[0]).toMatchObject({ ingredientId: 'ing-1' });
  });

  test('lỗi → không món nào được lưu: ném đúng lỗi gốc, không còn "lưu một phần"', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Dữ liệu gửi lên không hợp lệ.', 'BUSINESS', 400);
    apiMock.post.mockRejectedValue(error);

    await expect(
      service.addLogEntries?.('2026-10-02', 'lunch', [input('A'), input('B')]),
    ).rejects.toBe(error);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
  });

  test('danh sách rỗng → không gọi API (BE từ chối danh sách rỗng)', async () => {
    const { service, apiMock } = loadService();

    await expect(service.addLogEntries?.('2026-10-02', 'lunch', [])).resolves.toEqual([]);
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

describe('updateLogEntry', () => {
  test('đổi khối lượng: đọc bản ghi, tính lại dinh dưỡng rồi PUT /nutritiondiary/items/{id} (không tạo bản mới)', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    apiMock.get.mockResolvedValue(DAILY_DTO);
    apiMock.put.mockResolvedValue(item({ servingSize: 250, calories: 225 }));

    const updated = await service.updateLogEntry?.('2026-10-02', 'item-1', { grams: 250 });

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/daily', {
      params: { date: '2026-10-02' },
    });
    expect(apiMock.put).toHaveBeenCalledWith('/nutritiondiary/items/item-1', {
      servingSize: 250,
      // 450 kcal / 500 g × 250 g; 25 g đạm / 500 g × 250 g…
      calories: 225,
      proteinGrams: 13,
      carbsGrams: 28,
      fatGrams: 6,
    });
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(apiMock.delete).not.toHaveBeenCalled();
    // Calo vận động không liên quan đến việc sửa món.
    expect(healthSyncMock.getDailySummary).not.toHaveBeenCalled();
    expect(updated).toMatchObject({ id: 'item-1', grams: 250, nutrition: { calories: 225 } });
  });

  test('chỉ đổi bữa: PUT { mealType } và không cần đọc nhật ký', async () => {
    const { service, apiMock } = loadService();
    apiMock.put.mockResolvedValue(item({ mealType: 'Dinner' }));

    const updated = await service.updateLogEntry?.('2026-10-02', 'item-1', { mealType: 'dinner' });

    expect(apiMock.get).not.toHaveBeenCalled();
    const body = apiMock.put.mock.calls[0][1];
    expect(JSON.parse(JSON.stringify(body))).toEqual({ mealType: 'Dinner' });
    // Bữa lấy từ chính DTO BE trả về.
    expect(updated?.mealType).toBe('dinner');
  });

  test('đổi cả bữa lẫn khối lượng trong một PUT', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(DAILY_DTO);
    apiMock.put.mockResolvedValue(item({ mealType: 'Dinner', servingSize: 250 }));

    await service.updateLogEntry?.('2026-10-02', 'item-1', { grams: 250, mealType: 'dinner' });

    expect(apiMock.put).toHaveBeenCalledTimes(1);
    expect(apiMock.put.mock.calls[0][1]).toMatchObject({
      mealType: 'Dinner',
      servingSize: 250,
      calories: 225,
    });
  });

  test('không thấy bản ghi → báo lỗi, không ghi gì', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(DAILY_DTO);

    await expect(service.updateLogEntry?.('2026-10-02', 'khong-co', { grams: 1 })).rejects.toThrow(
      'Không tìm thấy bản ghi để sửa.',
    );
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  test('bản ghi đơn vị "phần": đổi số lượng, không gửi đơn vị (BE giữ nguyên)', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue({
      ...DAILY_DTO,
      meals: [
        {
          mealType: 'Lunch',
          subtotalCalories: 300,
          items: [item({ id: 'p-1', foodName: 'Bánh', servingSize: 1, unit: 'phần', calories: 300 })],
        },
      ],
    });
    apiMock.put.mockResolvedValue(item({ id: 'p-1', servingSize: 2, unit: 'phần', calories: 600 }));

    const updated = await service.updateLogEntry?.('2026-10-02', 'p-1', { grams: 2 });

    const body = apiMock.put.mock.calls[0][1];
    expect(JSON.parse(JSON.stringify(body))).toMatchObject({ servingSize: 2, calories: 600 });
    expect(body.unit).toBeUndefined();
    expect(updated?.unit).toBe('phần');
  });

  test('PUT lỗi → ném lỗi gốc để màn hình báo, nhật ký không bị đổi', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Không tìm thấy mục nhật ký dinh dưỡng.', 'NOT_FOUND', 404);
    apiMock.get.mockResolvedValue(DAILY_DTO);
    apiMock.put.mockRejectedValue(error);

    await expect(service.updateLogEntry?.('2026-10-02', 'item-1', { grams: 250 })).rejects.toBe(error);
    expect(apiMock.delete).not.toHaveBeenCalled();
  });
});

describe('deleteLogEntry', () => {
  test('DELETE /nutritiondiary/items/{id}', async () => {
    const { service, apiMock } = loadService();
    apiMock.delete.mockResolvedValue(true);

    await service.deleteLogEntry?.('2026-10-02', 'item-9');

    expect(apiMock.delete).toHaveBeenCalledWith('/nutritiondiary/items/item-9');
  });

  test('BE báo không tìm thấy → ném lỗi', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Không tìm thấy mục nhật ký dinh dưỡng cần xóa.', 'NOT_FOUND', 404);
    apiMock.delete.mockRejectedValue(error);

    await expect(service.deleteLogEntry?.('2026-10-02', 'item-9')).rejects.toBe(error);
  });
});

describe('foods', () => {
  const FOOD: FoodItemDto = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Ức gà',
    description: null,
    imageUrl: null,
    category: 'Thịt',
    defaultUnit: 'g',
    estimatedPriceVnd: 90000,
    caloriesPer100g: 165,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    proteinPer100g: 31,
    fiberPer100g: 0,
    sugarPer100g: 0,
    sodiumMgPer100g: 74,
    allergyId: 2,
    allergyName: 'Đậu phộng (Peanuts)',
    allergyIds: [2, 7],
    isVerified: true,
    isUserCreated: false,
    isFavorite: true,
    barcode: null,
    servings: [
      { id: 's1', label: '1 miếng', grams: 150 },
      { id: 's2', label: '100 g', grams: 100 },
    ],
    defaultServingId: 's1',
  };
  const PAGE = { items: [FOOD], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 };

  test('searchFoods: GET /foods với search, scope, trang; mọi dị ứng đổi sang slug, khẩu phần nhân đúng', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(PAGE);

    const foods = await service.searchFoods?.('  gà ', 'all');

    expect(apiMock.get).toHaveBeenCalledWith('/foods', {
      params: { search: 'gà', scope: 'all', page: 1, pageSize: 20 },
    });
    expect(foods).toHaveLength(1);
    expect(foods?.[0]).toMatchObject({
      name: 'Ức gà',
      verified: true,
      isFavorite: true,
      allergenIds: ['peanut', 'treeNut'],
      defaultServingId: 's1',
      // 165 kcal/100 g × 150 g
      nutritionPerServing: { calories: 248 },
      servingOptions: [
        { id: 's1', label: '1 miếng (150 g)', grams: 150 },
        { id: 's2', label: '100 g', grams: 100 },
      ],
    });
  });

  test.each(['all', 'recent', 'favorite', 'mine'] as const)(
    'bộ lọc "%s" → scope tương ứng của BE, không còn tự trả rỗng hay lấy ở máy',
    async filter => {
      const { service, apiMock } = loadService();
      apiMock.get.mockResolvedValue(PAGE);

      await service.searchFoods?.('', filter);

      expect(apiMock.get).toHaveBeenCalledWith('/foods', {
        params: { search: undefined, scope: filter, page: 1, pageSize: 20 },
      });
    },
  );

  test('searchFoods lỗi → ném lỗi gốc (màn hình hiện ErrorState)', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Máy chủ gặp sự cố.', 'SERVER', 500);
    apiMock.get.mockRejectedValue(error);

    await expect(service.searchFoods?.('gà', 'all')).rejects.toBe(error);
  });

  test('getFoodById: GET /foods/{id}', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(FOOD);

    const food = await service.getFoodById?.(FOOD.id);

    expect(apiMock.get).toHaveBeenCalledWith(`/foods/${FOOD.id}`);
    expect(food).toMatchObject({ id: FOOD.id, name: 'Ức gà' });
  });

  test('createFood: POST /foods với số liệu quy về trên 100 g; món trả về là "do bạn nhập", chưa xác minh', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({
      ...FOOD,
      id: 'new-food',
      name: 'Sinh tố bơ',
      allergyIds: [],
      isVerified: false,
      isUserCreated: true,
      isFavorite: false,
      servings: [{ id: 'sv', label: '250 ml', grams: 250 }],
      defaultServingId: 'sv',
    });

    const created = await service.createFood?.({
      name: 'Sinh tố bơ',
      amount: 250,
      unit: 'ml',
      nutrition: { calories: 280, proteinG: 4, carbsG: 30, fatG: 16 },
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      '/foods',
      expect.objectContaining({
        name: 'Sinh tố bơ',
        caloriesPer100g: 112,
        proteinPer100g: 1.6,
        servings: [{ label: '250 ml', grams: 250, isDefault: true }],
      }),
    );
    expect(created).toMatchObject({ id: 'new-food', verified: false, isUserCreated: true });
  });

  test('createFood: BE từ chối (trùng tên…) → ném lỗi gốc với thông báo tiếng Việt', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Bạn đã có một món cùng tên.', 'CONFLICT', 409);
    apiMock.post.mockRejectedValue(error);

    await expect(
      service.createFood?.({
        name: 'Sinh tố bơ',
        amount: 250,
        unit: 'ml',
        nutrition: { calories: 280, proteinG: 4, carbsG: 30, fatG: 16 },
      }),
    ).rejects.toBe(error);
  });

  test('setFoodFavorite(true) → POST /foods/{id}/favorite, trả trạng thái do BE xác nhận', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ isFavorite: true });

    await expect(service.setFoodFavorite?.(FOOD.id, true)).resolves.toBe(true);

    expect(apiMock.post).toHaveBeenCalledWith(`/foods/${FOOD.id}/favorite`);
    expect(apiMock.delete).not.toHaveBeenCalled();
  });

  test('setFoodFavorite(false) → DELETE /foods/{id}/favorite', async () => {
    const { service, apiMock } = loadService();
    apiMock.delete.mockResolvedValue({ isFavorite: false });

    await expect(service.setFoodFavorite?.(FOOD.id, false)).resolves.toBe(false);

    expect(apiMock.delete).toHaveBeenCalledWith(`/foods/${FOOD.id}/favorite`);
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

describe('getWeeklyProgress', () => {
  test('GET /nutritiondiary/weekly-progress?startDate= = 6 ngày trước, kết thúc ở hôm nay; có macro trung bình', async () => {
    const { service, apiMock } = loadService();
    const dates = [
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ];
    const dto: WeeklyProgressDto = {
      days: dates.map((date, index) => ({
        date,
        dayOfWeek: 'x',
        calories: index === 6 ? 1200 : 0,
        targetCalories: 1776,
        proteinGrams: index === 6 ? 60 : 0,
        carbsGrams: index === 6 ? 150 : 0,
        fatGrams: index === 6 ? 40 : 0,
        targetProteinGrams: 111,
        targetCarbsGrams: 222,
        targetFatGrams: 49,
      })),
    };
    apiMock.get.mockResolvedValue(dto);

    const summary = await service.getWeeklyProgress?.('2026-10-02');

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/weekly-progress', {
      params: { startDate: '2026-09-26' },
    });
    expect(summary?.calorieTarget).toBe(1776);
    expect(summary?.days).toHaveLength(7);
    expect(summary?.averageMacros).toEqual([
      { label: 'Protein', consumedG: 60, targetG: 111 },
      { label: 'Carbs', consumedG: 150, targetG: 222 },
      { label: 'Fat', consumedG: 40, targetG: 49 },
    ]);
  });
});

describe('phủ hết hàm của feature', () => {
  test('tạo món và yêu thích đã nối API (không còn rơi về mock)', () => {
    const { service } = loadService();

    expect(service.createFood).toBeDefined();
    expect(service.setFoodFavorite).toBeDefined();
  });
});
