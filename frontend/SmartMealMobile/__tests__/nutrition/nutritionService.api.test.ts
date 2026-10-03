/**
 * nutritionService.api (docs/fetch-api/part1 §7): gọi đúng endpoint BE, ghi nhật ký TUẦN TỰ, xử lý
 * một phần thất bại và sửa món (ghi bản mới rồi xóa bản cũ). `api` được mock — không gọi mạng thật.
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

function input(foodName: string, grams = 100): NewMealLogInput {
  return {
    foodName,
    servingLabel: `${grams} g`,
    grams,
    nutrition: { calories: grams, proteinG: 10, carbsG: 20, fatG: 5 },
    source: 'manual',
  };
}

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
  const healthSyncMock = { getDailySummary: jest.fn() };
  const includeActivity = { value: true };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
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
  const { PartialLogError, UpdateIncompleteError } =
    require('@/features/nutrition/services/nutrition.errors') as typeof import('@/features/nutrition/services/nutrition.errors');
  const { addUserCreatedFood } =
    require('@/features/nutrition/services/userFoods') as typeof import('@/features/nutrition/services/userFoods');
  // Cùng registry với isApiError của service để instanceof đúng sau jest.resetModules().
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return {
    service: nutritionApiService,
    apiMock,
    healthSyncMock,
    includeActivity,
    PartialLogError,
    UpdateIncompleteError,
    addUserCreatedFood,
    ApiError,
  };
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
  test('POST /nutritiondiary/log cho từng món, trả bản ghi đã tạo kèm giờ ghi', async () => {
    const { service, apiMock } = loadService();
    apiMock.post
      .mockResolvedValueOnce(item({ id: 'a', foodName: 'Cơm', servingSize: 150 }))
      .mockResolvedValueOnce(item({ id: 'b', foodName: 'Gà kho', servingSize: 120 }));

    const created = await service.addLogEntries?.('2026-10-02', 'lunch', [
      input('Cơm', 150),
      input('Gà kho', 120),
    ]);

    expect(apiMock.post).toHaveBeenCalledTimes(2);
    expect(apiMock.post.mock.calls[0]).toEqual([
      '/nutritiondiary/log',
      expect.objectContaining({
        logDate: '2026-10-02',
        mealType: 'Lunch',
        foodName: 'Cơm',
        servingSize: 150,
        unit: 'g',
        logMethod: 'Manual',
      }),
    ]);
    expect(created?.map(entry => entry.id)).toEqual(['a', 'b']);
    expect(created?.every(entry => typeof entry.loggedAt === 'string')).toBe(true);
  });

  test('ghi TUẦN TỰ, không song song (BE dễ tạo trùng dòng nhóm bữa)', async () => {
    const { service, apiMock } = loadService();
    let inFlight = 0;
    let maxInFlight = 0;
    apiMock.post.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight -= 1;
      return item();
    });

    await service.addLogEntries?.('2026-10-02', 'lunch', [input('A'), input('B'), input('C')]);

    expect(apiMock.post).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
  });

  test('một món lỗi nghiệp vụ → vẫn thử các món sau, ném PartialLogError với món chưa lưu', async () => {
    const { service, apiMock, ApiError, PartialLogError } = loadService();
    apiMock.post
      .mockResolvedValueOnce(item({ id: 'a' }))
      .mockRejectedValueOnce(new ApiError('Dữ liệu gửi lên không hợp lệ.', 'BUSINESS', 400))
      .mockResolvedValueOnce(item({ id: 'c' }));
    const inputs = [input('A'), input('B'), input('C')];

    const error = await service.addLogEntries?.('2026-10-02', 'lunch', inputs).catch(e => e);

    expect(error).toBeInstanceOf(PartialLogError);
    expect(error.saved.map((entry: { id: string }) => entry.id)).toEqual(['a', 'c']);
    expect(error.failed).toEqual([inputs[1]]);
    expect(error.message).toBe('Đã lưu 2/3 món. 1 món chưa lưu được, vui lòng thử lại.');
    expect(apiMock.post).toHaveBeenCalledTimes(3);
  });

  test('mất mạng giữa chừng → dừng, các món còn lại nằm trong danh sách chưa lưu', async () => {
    const { service, apiMock, ApiError, PartialLogError } = loadService();
    apiMock.post
      .mockResolvedValueOnce(item({ id: 'a' }))
      .mockRejectedValueOnce(new ApiError('Không kết nối được máy chủ.', 'NETWORK'));
    const inputs = [input('A'), input('B'), input('C')];

    const error = await service.addLogEntries?.('2026-10-02', 'lunch', inputs).catch(e => e);

    expect(error).toBeInstanceOf(PartialLogError);
    expect(error.saved).toHaveLength(1);
    expect(error.failed).toEqual([inputs[1], inputs[2]]);
    expect(apiMock.post).toHaveBeenCalledTimes(2);
  });

  test('không lưu được món nào → ném đúng lỗi gốc (không phải PartialLogError)', async () => {
    const { service, apiMock, ApiError, PartialLogError } = loadService();
    const networkError = new ApiError('Không kết nối được máy chủ.', 'NETWORK');
    apiMock.post.mockRejectedValue(networkError);

    const error = await service.addLogEntries?.('2026-10-02', 'lunch', [input('A'), input('B')]).catch(e => e);

    expect(error).toBe(networkError);
    expect(error).not.toBeInstanceOf(PartialLogError);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
  });

  test('danh sách rỗng → không gọi API', async () => {
    const { service, apiMock } = loadService();

    await expect(service.addLogEntries?.('2026-10-02', 'lunch', [])).resolves.toEqual([]);
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

describe('updateLogEntry', () => {
  test('ghi bản mới (tính lại dinh dưỡng, đổi bữa) RỒI mới xóa bản cũ', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 0 });
    apiMock.get.mockResolvedValue(DAILY_DTO);
    const order: string[] = [];
    apiMock.post.mockImplementation(async () => {
      order.push('post');
      return item({ id: 'new-1', servingSize: 250, calories: 225 });
    });
    apiMock.delete.mockImplementation(async () => {
      order.push('delete');
      return true;
    });

    const updated = await service.updateLogEntry?.('2026-10-02', 'item-1', {
      grams: 250,
      mealType: 'dinner',
    });

    expect(order).toEqual(['post', 'delete']);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/nutritiondiary/log',
      expect.objectContaining({
        logDate: '2026-10-02',
        mealType: 'Dinner',
        foodName: 'Phở bò tái',
        servingSize: 250,
        unit: 'g',
        // 450 kcal / 500 g × 250 g
        calories: 225,
        logMethod: 'Manual',
      }),
    );
    expect(apiMock.delete).toHaveBeenCalledWith('/nutritiondiary/items/item-1');
    expect(updated).toMatchObject({ id: 'new-1', mealType: 'dinner' });
  });

  test('ghi bản mới lỗi → KHÔNG xóa bản cũ (không mất món)', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 0 });
    apiMock.get.mockResolvedValue(DAILY_DTO);
    const error = new Error('lỗi ghi');
    apiMock.post.mockRejectedValue(error);

    await expect(service.updateLogEntry?.('2026-10-02', 'item-1', { grams: 250 })).rejects.toBe(error);
    expect(apiMock.delete).not.toHaveBeenCalled();
  });

  test('ghi được bản mới nhưng xóa bản cũ lỗi → UpdateIncompleteError (có thể bị trùng)', async () => {
    const { service, apiMock, healthSyncMock, UpdateIncompleteError } = loadService();
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 0 });
    apiMock.get.mockResolvedValue(DAILY_DTO);
    apiMock.post.mockResolvedValue(item({ id: 'new-1', servingSize: 250 }));
    apiMock.delete.mockRejectedValue(new Error('mất mạng'));

    const error = await service.updateLogEntry?.('2026-10-02', 'item-1', { grams: 250 }).catch(e => e);

    expect(error).toBeInstanceOf(UpdateIncompleteError);
    expect(error.savedEntry.id).toBe('new-1');
    expect(error.message).toContain('có thể bị trùng');
  });

  test('không thấy bản ghi → báo lỗi, không ghi gì', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 0 });
    apiMock.get.mockResolvedValue(DAILY_DTO);

    await expect(service.updateLogEntry?.('2026-10-02', 'khong-co', { grams: 1 })).rejects.toThrow(
      'Không tìm thấy bản ghi để sửa.',
    );
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(apiMock.delete).not.toHaveBeenCalled();
  });

  test('bản ghi đơn vị "phần" giữ nguyên đơn vị khi sửa', async () => {
    const { service, apiMock, healthSyncMock } = loadService();
    healthSyncMock.getDailySummary.mockResolvedValue({ caloriesBurned: 0 });
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
    apiMock.post.mockResolvedValue(item({ id: 'p-2', servingSize: 2, unit: 'phần', calories: 600 }));
    apiMock.delete.mockResolvedValue(true);

    await service.updateLogEntry?.('2026-10-02', 'p-1', { grams: 2 });

    expect(apiMock.post).toHaveBeenCalledWith(
      '/nutritiondiary/log',
      expect.objectContaining({ servingSize: 2, unit: 'phần', calories: 600 }),
    );
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

describe('searchFoods / getFoodById', () => {
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
  };
  const PAGE = { items: [FOOD], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 };

  test('bộ lọc "all" → GET /foods?search=&page=1&pageSize=20, dị ứng đổi sang slug', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(PAGE);

    const foods = await service.searchFoods?.('  gà ', 'all');

    expect(apiMock.get).toHaveBeenCalledWith('/foods', {
      params: { search: 'gà', page: 1, pageSize: 20 },
    });
    expect(foods).toHaveLength(1);
    expect(foods?.[0]).toMatchObject({ name: 'Ức gà', verified: true, allergenIds: ['peanut'] });
  });

  test('không có từ khóa → không gửi search', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(PAGE);

    await service.searchFoods?.('   ', 'all');

    expect(apiMock.get).toHaveBeenCalledWith('/foods', {
      params: { search: undefined, page: 1, pageSize: 20 },
    });
  });

  test('món tự nhập trùng từ khóa được đặt lên đầu kết quả', async () => {
    const { service, apiMock, addUserCreatedFood } = loadService();
    apiMock.get.mockResolvedValue(PAGE);
    addUserCreatedFood({
      name: 'Gà rang muối nhà làm',
      amount: 100,
      unit: 'g',
      nutrition: { calories: 200, proteinG: 20, carbsG: 5, fatG: 10 },
    });

    const foods = await service.searchFoods?.('gà', 'all');

    expect(foods?.map(food => food.name)).toEqual(['Gà rang muối nhà làm', 'Ức gà']);
  });

  test('"Gần đây"/"Yêu thích" chưa có nguồn dữ liệu → rỗng, không gọi API, không trả món giả', async () => {
    const { service, apiMock } = loadService();

    await expect(service.searchFoods?.('', 'recent')).resolves.toEqual([]);
    await expect(service.searchFoods?.('', 'favorite')).resolves.toEqual([]);
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  test('"Món của tôi" lấy ở máy, không gọi API', async () => {
    const { service, apiMock, addUserCreatedFood } = loadService();
    addUserCreatedFood({
      name: 'Sinh tố bơ',
      amount: 250,
      unit: 'ml',
      nutrition: { calories: 280, proteinG: 4, carbsG: 30, fatG: 16 },
    });

    const foods = await service.searchFoods?.('', 'mine');

    expect(foods?.map(food => food.name)).toEqual(['Sinh tố bơ']);
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  test('getFoodById: GET /foods/{id} cho món của hệ thống', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(FOOD);

    const food = await service.getFoodById?.(FOOD.id);

    expect(apiMock.get).toHaveBeenCalledWith(`/foods/${FOOD.id}`);
    expect(food).toMatchObject({ id: FOOD.id, name: 'Ức gà' });
  });

  test('getFoodById: món tự nhập lấy ở máy, không gọi API', async () => {
    const { service, apiMock, addUserCreatedFood } = loadService();
    const created = addUserCreatedFood({
      name: 'Sinh tố bơ',
      amount: 250,
      unit: 'ml',
      nutrition: { calories: 280, proteinG: 4, carbsG: 30, fatG: 16 },
    });

    await expect(service.getFoodById?.(created.id)).resolves.toBe(created);
    expect(apiMock.get).not.toHaveBeenCalled();
  });
});

describe('getWeeklyProgress', () => {
  test('GET /nutritiondiary/weekly-progress?startDate= = 6 ngày trước, kết thúc ở ngày hôm nay', async () => {
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
      })),
    };
    apiMock.get.mockResolvedValue(dto);

    const summary = await service.getWeeklyProgress?.('2026-10-02');

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/weekly-progress', {
      params: { startDate: '2026-09-26' },
    });
    expect(summary?.calorieTarget).toBe(1776);
    expect(summary?.days).toHaveLength(7);
    expect(summary?.averageMacros).toEqual([]);
  });
});

describe('hàm BE chưa có', () => {
  test('createFood không có trong bản API (tự rơi về mock)', () => {
    const { service } = loadService();

    expect(service.createFood).toBeUndefined();
  });
});
