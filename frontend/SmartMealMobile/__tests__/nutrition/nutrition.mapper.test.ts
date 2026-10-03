/**
 * nutrition.mapper (docs/fetch-api/part1 §7): quy đổi DTO của BE ↔ type FE cho nhật ký dinh
 * dưỡng, tiến độ tuần và thực phẩm. Fixture khớp DTO C# (JSON camelCase).
 */
import {
  fromDailyDiaryDto,
  fromDiaryItemDto,
  fromFoodDto,
  fromWeeklyProgressDto,
  logMethodToSource,
  sourceToLogMethod,
  toCreateFoodRequest,
  toDiaryItemInput,
  toLogMealBatchRequest,
  toUpdateDiaryItemRequest,
} from '@/features/nutrition/services/nutrition.mapper';
import type {
  DailyDiarySummaryDto,
  DiaryItemDto,
  FoodItemDto,
  WeeklyProgressDto,
} from '@/features/nutrition/types/nutrition.api.types';
import type { NewMealLogInput } from '@/features/nutrition/types/nutrition.types';
import { findEntryById } from '@/features/nutrition/utils/diary';

function item(overrides: Partial<DiaryItemDto> = {}): DiaryItemDto {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    foodName: 'Bún bò',
    servingSize: 450,
    unit: 'g',
    calories: 420.4,
    carbsGrams: 46.2,
    fatGrams: 14.2,
    proteinGrams: 22.6,
    logMethod: 'Manual',
    mealType: 'Breakfast',
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
  totalCalories: 1120.4,
  totalCarbs: 100,
  totalFat: 30,
  totalProtein: 60,
  targetCalories: 1775.6,
  targetCarbs: 222.4,
  targetFat: 49.3,
  targetProtein: 111.4,
  meals: [
    {
      mealType: 'Breakfast',
      subtotalCalories: 420.4,
      items: [item({ logMethod: 'AiImage' })],
    },
    { mealType: 'Lunch', subtotalCalories: 0, items: [] },
    {
      mealType: 'Dinner',
      subtotalCalories: 700,
      items: [
        item({
          id: '22222222-2222-2222-2222-222222222222',
          foodName: 'Cơm tấm',
          servingSize: 2,
          unit: 'phần',
          calories: 700,
          carbsGrams: 90,
          fatGrams: 20,
          proteinGrams: 40,
          mealType: 'Dinner',
        }),
      ],
    },
    { mealType: 'Snack', subtotalCalories: 0, items: [] },
  ],
};

const MEAL_INPUT: NewMealLogInput = {
  foodName: 'Phở bò tái',
  servingLabel: '1 tô (500 g)',
  grams: 500,
  nutrition: { calories: 450, proteinG: 25, carbsG: 55, fatG: 12 },
  source: 'database',
};

describe('toDiaryItemInput', () => {
  test('luôn gửi unit "g" và servingSize = grams (BR-053)', () => {
    expect(toDiaryItemInput(MEAL_INPUT)).toEqual({
      foodName: 'Phở bò tái',
      servingSize: 500,
      unit: 'g',
      calories: 450,
      proteinGrams: 25,
      carbsGrams: 55,
      fatGrams: 12,
      logMethod: 'Manual',
    });
  });

  test('món lấy từ danh mục mang theo id thực phẩm/công thức để "Gần đây" nhớ món', () => {
    expect(
      toDiaryItemInput({ ...MEAL_INPUT, ingredientId: 'ing-1', recipeId: 'rec-1' }),
    ).toMatchObject({ ingredientId: 'ing-1', recipeId: 'rec-1' });
  });

  test('logMethod: mặc định theo source, truyền rõ thì giữ nguyên', () => {
    expect(toDiaryItemInput({ ...MEAL_INPUT, source: 'ai' }).logMethod).toBe('AiImage');
    expect(toDiaryItemInput({ ...MEAL_INPUT, source: 'manual' }).logMethod).toBe('Manual');
    expect(toDiaryItemInput({ ...MEAL_INPUT, source: 'ai', logMethod: 'Voice' }).logMethod).toBe(
      'Voice',
    );
    expect(toDiaryItemInput({ ...MEAL_INPUT, logMethod: 'Barcode' }).logMethod).toBe('Barcode');
  });

  test('ghi lại bản ghi đơn vị khác gram thì giữ nguyên đơn vị', () => {
    expect(toDiaryItemInput({ ...MEAL_INPUT, grams: 2 }, 'phần')).toMatchObject({
      servingSize: 2,
      unit: 'phần',
    });
  });
});

describe('toLogMealBatchRequest', () => {
  test('cả bữa trong một request: ngày theo giờ máy, tên bữa PascalCase, mọi món theo thứ tự', () => {
    const request = toLogMealBatchRequest('2026-10-02', 'lunch', [
      MEAL_INPUT,
      { ...MEAL_INPUT, foodName: 'Trà đào', grams: 300 },
    ]);

    expect(request.logDate).toBe('2026-10-02');
    expect(request.mealType).toBe('Lunch');
    expect(request.items.map(entry => entry.foodName)).toEqual(['Phở bò tái', 'Trà đào']);
    expect(request.items[1].servingSize).toBe(300);
  });

  test.each([
    ['breakfast', 'Breakfast'],
    ['lunch', 'Lunch'],
    ['dinner', 'Dinner'],
    ['snack', 'Snack'],
  ] as const)('bữa %s → %s', (mealType, expected) => {
    expect(toLogMealBatchRequest('2026-10-02', mealType, [MEAL_INPUT]).mealType).toBe(expected);
  });
});

describe('toUpdateDiaryItemRequest', () => {
  // JSON.stringify bỏ trường undefined: đây mới là thứ BE nhận được.
  const wire = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;

  test('chỉ đổi bữa → chỉ gửi mealType (BE giữ nguyên các trường còn lại)', () => {
    expect(wire(toUpdateDiaryItemRequest({ mealType: 'dinner' }))).toEqual({ mealType: 'Dinner' });
  });

  test('đổi khối lượng → gửi kèm dinh dưỡng đã tính lại', () => {
    expect(
      wire(
        toUpdateDiaryItemRequest({
          grams: 300,
          nutrition: { calories: 270, proteinG: 15, carbsG: 33, fatG: 7 },
        }),
      ),
    ).toEqual({ servingSize: 300, calories: 270, proteinGrams: 15, carbsGrams: 33, fatGrams: 7 });
  });

  test('đổi cả bữa lẫn khối lượng', () => {
    expect(
      wire(
        toUpdateDiaryItemRequest({
          mealType: 'snack',
          grams: 100,
          nutrition: { calories: 90, proteinG: 1, carbsG: 20, fatG: 0 },
        }),
      ),
    ).toMatchObject({ mealType: 'Snack', servingSize: 100, calories: 90 });
  });
});

describe('logMethod ↔ source', () => {
  test('Manual → manual; AiImage/Voice → ai (đã xác nhận); Barcode → database', () => {
    expect(logMethodToSource('Manual')).toEqual({ source: 'manual', aiConfirmed: false });
    expect(logMethodToSource('AiImage')).toEqual({ source: 'ai', aiConfirmed: true });
    expect(logMethodToSource('voice')).toEqual({ source: 'ai', aiConfirmed: true });
    expect(logMethodToSource('Barcode')).toEqual({ source: 'database', aiConfirmed: false });
    expect(logMethodToSource('Gì đó lạ')).toEqual({ source: 'manual', aiConfirmed: false });
  });

  test('sourceToLogMethod là nghịch đảo cho bản ghi đã lưu', () => {
    expect(sourceToLogMethod('manual')).toBe('Manual');
    expect(sourceToLogMethod('ai')).toBe('AiImage');
    expect(sourceToLogMethod('database')).toBe('Barcode');
  });
});

describe('fromDiaryItemDto', () => {
  test('món tính theo gram: nhãn "450 g", bữa lấy từ DTO, giờ ghi = createdAt, dinh dưỡng làm tròn', () => {
    const entry = fromDiaryItemDto(item());

    expect(entry).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      mealType: 'breakfast',
      foodName: 'Bún bò',
      servingLabel: '450 g',
      grams: 450,
      nutrition: { calories: 420, proteinG: 23, carbsG: 46, fatG: 14 },
      source: 'manual',
      aiConfirmed: false,
      loggedAt: '2026-10-02T05:30:00.000Z',
    });
    expect(entry.unit).toBeUndefined();
  });

  test('bữa truyền vào (nhóm của daily) được ưu tiên hơn bữa trong DTO', () => {
    expect(fromDiaryItemDto(item({ mealType: 'Lunch' }), 'dinner').mealType).toBe('dinner');
    expect(fromDiaryItemDto(item({ mealType: 'LUNCH' })).mealType).toBe('lunch');
  });

  test('giờ ghi thiếu múi giờ vẫn được hiểu là UTC; chuỗi hỏng → không có giờ ghi', () => {
    expect(fromDiaryItemDto(item({ createdAt: '2026-10-02T05:30:00' })).loggedAt).toBe(
      '2026-10-02T05:30:00.000Z',
    );
    expect(fromDiaryItemDto(item({ createdAt: 'khong-phai-ngay' })).loggedAt).toBeUndefined();
  });

  test('nutritionPerGram tính từ số thực của BE, không từ số đã làm tròn', () => {
    const entry = fromDiaryItemDto(item({ servingSize: 3, calories: 1.4, proteinGrams: 0.4 }));

    expect(entry.nutrition.calories).toBe(1);
    expect(entry.nutrition.proteinG).toBe(0);
    expect(entry.nutritionPerGram.calories).toBeCloseTo(1.4 / 3, 10);
    expect(entry.nutritionPerGram.proteinG).toBeCloseTo(0.4 / 3, 10);
  });

  test('bản ghi do nơi khác tạo với đơn vị "phần": giữ đơn vị, số lượng thành "grams"', () => {
    const entry = fromDiaryItemDto(item({ servingSize: 1.5, unit: 'phần', calories: 300 }));

    expect(entry.servingLabel).toBe('1.5 phần');
    expect(entry.unit).toBe('phần');
    expect(entry.grams).toBe(1.5);
    expect(entry.nutritionPerGram.calories).toBe(200);
  });

  test('servingSize không hợp lệ (0) được coi là 1 để không chia cho 0', () => {
    const entry = fromDiaryItemDto(item({ servingSize: 0, unit: '' }));

    expect(entry.grams).toBe(1);
    expect(entry.servingLabel).toBe('1 g');
    expect(Number.isFinite(entry.nutritionPerGram.calories)).toBe(true);
  });

  test('AI → đã xác nhận (BR-054)', () => {
    expect(fromDiaryItemDto(item({ logMethod: 'AiImage' }))).toMatchObject({
      source: 'ai',
      aiConfirmed: true,
    });
  });
});

describe('fromDailyDiaryDto', () => {
  test('luôn đủ 4 bữa, gom món đúng bữa, mục tiêu làm tròn', () => {
    const diary = fromDailyDiaryDto(DAILY_DTO, {
      activityCaloriesBurned: 0,
      includeActivityCalories: true,
    });

    expect(diary.date).toBe('2026-10-02');
    expect(diary.calorieTarget).toBe(1776);
    expect(diary.macroTargets).toEqual({ proteinG: 111, carbsG: 222, fatG: 49 });
    expect(diary.entriesByMeal.breakfast.map(entry => entry.foodName)).toEqual(['Bún bò']);
    expect(diary.entriesByMeal.lunch).toEqual([]);
    expect(diary.entriesByMeal.dinner.map(entry => entry.foodName)).toEqual(['Cơm tấm']);
    expect(diary.entriesByMeal.snack).toEqual([]);
  });

  test('tên bữa không phân biệt hoa/thường; bữa lạ rơi về bữa phụ', () => {
    const diary = fromDailyDiaryDto(
      {
        ...DAILY_DTO,
        meals: [
          { mealType: 'LUNCH', subtotalCalories: 100, items: [item({ foodName: 'A' })] },
          { mealType: 'Brunch', subtotalCalories: 100, items: [item({ foodName: 'B' })] },
        ],
      },
      { activityCaloriesBurned: 0, includeActivityCalories: true },
    );

    expect(diary.entriesByMeal.lunch.map(entry => entry.foodName)).toEqual(['A']);
    expect(diary.entriesByMeal.snack.map(entry => entry.foodName)).toEqual(['B']);
  });

  test('calo vận động chỉ được cộng khi bật công tắc (BR-040→042)', () => {
    const base = { activityCaloriesBurned: 180 };

    expect(
      fromDailyDiaryDto(DAILY_DTO, { ...base, includeActivityCalories: true }).activityCalories,
    ).toBe(180);
    expect(
      fromDailyDiaryDto(DAILY_DTO, { ...base, includeActivityCalories: false }).activityCalories,
    ).toBe(0);
  });

  test('findEntryById tìm đúng bản ghi ở mọi bữa', () => {
    const diary = fromDailyDiaryDto(DAILY_DTO, {
      activityCaloriesBurned: 0,
      includeActivityCalories: true,
    });

    expect(findEntryById(diary, '22222222-2222-2222-2222-222222222222')?.foodName).toBe('Cơm tấm');
    expect(findEntryById(diary, 'khong-co')).toBeUndefined();
  });
});

describe('fromWeeklyProgressDto', () => {
  // 26/09/2026 là thứ Bảy → 02/10/2026 là thứ Sáu. [ngày, thứ (BE), kcal, protein, carbs, fat]
  const days = [
    ['2026-09-26', 'Saturday', 0, 0, 0, 0],
    ['2026-09-27', 'Sunday', 1800.4, 90.2, 200, 60],
    ['2026-09-28', 'Monday', 2100, 110, 260, 70],
    ['2026-09-29', 'Tuesday', 0, 0, 0, 0],
    ['2026-09-30', 'Wednesday', 1500, 80, 180, 50],
    ['2026-10-01', 'Thursday', 1990, 100, 240, 66],
    ['2026-10-02', 'Friday', 1200, 60, 150, 40],
  ] as const;
  const dto: WeeklyProgressDto = {
    days: days.map(([date, dayOfWeek, calories, proteinGrams, carbsGrams, fatGrams]) => ({
      date,
      dayOfWeek,
      calories,
      targetCalories: 1775.6,
      proteinGrams,
      carbsGrams,
      fatGrams,
      targetProteinGrams: 111.4,
      targetCarbsGrams: 222.4,
      targetFatGrams: 49.3,
    })),
  };

  test('nhãn thứ tính từ ngày (BE trả tiếng Anh), đánh dấu hôm nay, khoảng ngày', () => {
    const summary = fromWeeklyProgressDto(dto, '2026-10-02');

    expect(summary.days.map(day => day.label)).toEqual(['T7', 'CN', 'T2', 'T3', 'T4', 'T5', 'T6']);
    expect(summary.days.map(day => day.isToday)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    ]);
    expect(summary.days[1].calories).toBe(1800);
    expect(summary.rangeLabel).toBe('26/09–02/10');
    expect(summary.calorieTarget).toBe(1776);
  });

  test('ngày chưa ghi gì không tính vào trung bình và "ngày đạt mục tiêu"', () => {
    const summary = fromWeeklyProgressDto(dto, '2026-10-02');

    // 5 ngày có dữ liệu: 1800 + 2100 + 1500 + 1990 + 1200 = 8590.
    expect(summary.averageCalories).toBe(1718);
    // Đạt mục tiêu (≤ 1776): 1500 và 1200.
    expect(summary.daysOnTarget).toBe(2);
  });

  test('macro trung bình tính trên các ngày đã ghi, so với mục tiêu macro của hồ sơ', () => {
    // Protein (90.2 + 110 + 80 + 100 + 60) / 5 = 88,04; carbs 1030 / 5 = 206; fat 286 / 5 = 57,2.
    expect(fromWeeklyProgressDto(dto, '2026-10-02').averageMacros).toEqual([
      { label: 'Protein', consumedG: 88, targetG: 111 },
      { label: 'Carbs', consumedG: 206, targetG: 222 },
      { label: 'Fat', consumedG: 57, targetG: 49 },
    ]);
  });

  test('tuần chưa ghi gì → trung bình 0, không chia cho 0, ẩn khối macro', () => {
    const empty = fromWeeklyProgressDto(
      {
        days: dto.days.map(day => ({
          ...day,
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
        })),
      },
      '2026-10-02',
    );

    expect(empty.averageCalories).toBe(0);
    expect(empty.daysOnTarget).toBe(0);
    expect(empty.averageMacros).toEqual([]);
  });

  test('BE không trả ngày nào → không ném lỗi', () => {
    expect(fromWeeklyProgressDto({ days: [] }, '2026-10-02')).toMatchObject({
      rangeLabel: '',
      calorieTarget: 0,
      days: [],
      averageMacros: [],
    });
  });
});

describe('fromFoodDto', () => {
  const food: FoodItemDto = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Ức gà',
    description: null,
    imageUrl: null,
    category: 'Thịt',
    defaultUnit: 'g',
    estimatedPriceVnd: 90000,
    caloriesPer100g: 165.2,
    carbsPer100g: 0,
    fatPer100g: 3.64,
    proteinPer100g: 31.04,
    fiberPer100g: 0,
    sugarPer100g: 0,
    sodiumMgPer100g: 74.4,
    allergyId: null,
    allergyName: null,
    allergyIds: [],
    isVerified: true,
    isUserCreated: false,
    isFavorite: false,
    barcode: null,
    servings: [{ id: 's-100', label: '100 g', grams: 100 }],
    defaultServingId: 's-100',
  };
  const resolveSlug = (id: number) => ({ 2: 'peanut', 3: 'seafood' })[id as 2 | 3];

  test('dinh dưỡng theo khẩu phần mặc định "100 g", dữ liệu đã xác minh', () => {
    expect(fromFoodDto(food, resolveSlug)).toEqual({
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Ức gà',
      verified: true,
      isFavorite: false,
      servingOptions: [{ id: 's-100', label: '100 g', grams: 100 }],
      defaultServingId: 's-100',
      nutritionPerServing: {
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        sugarG: 0,
        sodiumMg: 74,
        fiberG: 0,
      },
    });
  });

  test('khẩu phần có nhãn ghi kèm gram và dinh dưỡng nhân theo khẩu phần mặc định', () => {
    const result = fromFoodDto(
      {
        ...food,
        servings: [
          { id: 'tô', label: '1 tô', grams: 500 },
          { id: 'g100', label: '100 g', grams: 100 },
        ],
        defaultServingId: 'tô',
      },
      resolveSlug,
    );

    expect(result.servingOptions).toEqual([
      { id: 'tô', label: '1 tô (500 g)', grams: 500 },
      { id: 'g100', label: '100 g', grams: 100 },
    ]);
    expect(result.defaultServingId).toBe('tô');
    expect(result.nutritionPerServing).toMatchObject({
      calories: 826,
      proteinG: 155.2,
      fatG: 18.2,
      sodiumMg: 372,
    });
  });

  test('không có khẩu phần hoặc id mặc định lạ → rơi về khẩu phần hợp lệ, không ném lỗi', () => {
    expect(fromFoodDto({ ...food, servings: [], defaultServingId: null }, resolveSlug)).toMatchObject({
      servingOptions: [{ id: 'g-100', label: '100 g', grams: 100 }],
      defaultServingId: 'g-100',
    });
    expect(
      fromFoodDto(
        {
          ...food,
          servings: [
            { id: 'a', label: '1 chén', grams: 200 },
            { id: 'b', label: '1 muỗng', grams: 15 },
          ],
          defaultServingId: 'khong-co',
        },
        resolveSlug,
      ).defaultServingId,
    ).toBe('a');
  });

  test('mọi id dị ứng của BE → slug FE, bỏ trùng và id lạ; không có thì không cảnh báo', () => {
    expect(
      fromFoodDto({ ...food, allergyIds: [2, 2, 99, 3] }, resolveSlug).allergenIds,
    ).toEqual(['peanut', 'seafood']);
    expect(fromFoodDto({ ...food, allergyIds: [99] }, resolveSlug).allergenIds).toBeUndefined();
    expect(fromFoodDto(food, resolveSlug).allergenIds).toBeUndefined();
  });

  test('món chưa kiểm chứng/tự nhập không được gắn "đã xác minh" (BR-120/121); giữ trạng thái yêu thích', () => {
    expect(
      fromFoodDto(
        { ...food, isVerified: false, isUserCreated: true, isFavorite: true },
        resolveSlug,
      ),
    ).toMatchObject({ verified: false, isUserCreated: true, isFavorite: true });
    expect(fromFoodDto({ ...food, isVerified: false }, resolveSlug)).toMatchObject({
      verified: false,
    });
    expect(fromFoodDto(food, resolveSlug).isUserCreated).toBeUndefined();
  });
});

describe('toCreateFoodRequest', () => {
  test('g: số liệu của cả khẩu phần quy về trên 100 g; khẩu phần duy nhất là phần đã nhập', () => {
    expect(
      toCreateFoodRequest({
        name: '  Bánh quy yến mạch ',
        amount: 50,
        unit: 'g',
        nutrition: { calories: 250, proteinG: 5, carbsG: 30, fatG: 12, sugarG: 10 },
      }),
    ).toEqual({
      name: 'Bánh quy yến mạch',
      caloriesPer100g: 500,
      proteinPer100g: 10,
      carbsPer100g: 60,
      fatPer100g: 24,
      fiberPer100g: 0,
      sugarPer100g: 20,
      sodiumMgPer100g: 0,
      servings: [{ label: '50 g', grams: 50, isDefault: true }],
    });
  });

  test('ml được coi như g (BE chỉ biết gam), nhãn giữ "ml"', () => {
    expect(
      toCreateFoodRequest({
        name: 'Sữa hạt',
        amount: 250,
        unit: 'ml',
        nutrition: { calories: 100, proteinG: 8, carbsG: 12, fatG: 2.5 },
      }),
    ).toMatchObject({
      caloriesPer100g: 40,
      proteinPer100g: 3.2,
      carbsPer100g: 4.8,
      fatPer100g: 1,
      servings: [{ label: '250 ml', grams: 250, isDefault: true }],
    });
  });

  test('không để nhiễu dấu phẩy động (2.4600000000000004) lên server', () => {
    const request = toCreateFoodRequest({
      name: 'Món thử',
      amount: 500,
      unit: 'g',
      nutrition: { calories: 450, proteinG: 12.3, carbsG: 50, fatG: 10 },
    });

    expect(request.proteinPer100g).toBe(2.46);
  });

  test('"phần" nhỏ: khối lượng quy ước 100 g/phần nên số trên 100 g bằng đúng số người dùng nhập', () => {
    expect(
      toCreateFoodRequest({
        name: 'Phần ăn nhẹ',
        amount: 1,
        unit: 'phần',
        nutrition: { calories: 300, proteinG: 20, carbsG: 30, fatG: 10 },
      }),
    ).toMatchObject({
      caloriesPer100g: 300,
      proteinPer100g: 20,
      carbsPer100g: 30,
      fatPer100g: 10,
      servings: [{ label: '1 phần', grams: 100, isDefault: true }],
    });
  });

  test('"phần" lớn: nới khối lượng để tổng đa lượng/100 g không vượt giới hạn 100 g của BE', () => {
    // 40 + 70 + 20 = 130 g đa lượng trong 1 phần → phần phải nặng ≥ 130 g.
    const request = toCreateFoodRequest({
      name: 'Cơm gà',
      amount: 1,
      unit: 'phần',
      nutrition: { calories: 650, proteinG: 40, carbsG: 70, fatG: 20 },
    });

    expect(request.servings).toEqual([{ label: '1 phần', grams: 130, isDefault: true }]);
    expect(request.caloriesPer100g).toBe(500);
    expect(request.proteinPer100g + request.carbsPer100g + request.fatPer100g).toBeCloseTo(100, 3);
  });

  test('"phần" giàu năng lượng: khối lượng đủ để không quá 900 kcal/100 g', () => {
    const request = toCreateFoodRequest({
      name: 'Phần bơ đậu phộng',
      amount: 1,
      unit: 'phần',
      nutrition: { calories: 1800, proteinG: 10, carbsG: 20, fatG: 5 },
    });

    expect(request.servings[0].grams).toBe(200);
    expect(request.caloriesPer100g).toBe(900);
  });

  test('nhiều phần: khẩu phần là cả số phần đã nhập, quy ra gam theo từng phần', () => {
    const request = toCreateFoodRequest({
      name: 'Hai phần mì',
      amount: 2,
      unit: 'phần',
      nutrition: { calories: 600, proteinG: 30, carbsG: 60, fatG: 20 },
    });

    expect(request.servings).toEqual([{ label: '2 phần', grams: 200, isDefault: true }]);
    expect(request.caloriesPer100g).toBe(300);
  });

  test('khẩu phần mặc định cho đúng số đã nhập sau khi đọc lại (round-trip với fromFoodDto)', () => {
    const request = toCreateFoodRequest({
      name: 'Cơm gà',
      amount: 1,
      unit: 'phần',
      nutrition: { calories: 650, proteinG: 40, carbsG: 70, fatG: 20, sodiumMg: 800 },
    });
    const dto: FoodItemDto = {
      id: 'new',
      name: request.name,
      description: null,
      imageUrl: null,
      category: 'General',
      defaultUnit: 'g',
      estimatedPriceVnd: 0,
      caloriesPer100g: request.caloriesPer100g,
      carbsPer100g: request.carbsPer100g,
      fatPer100g: request.fatPer100g,
      proteinPer100g: request.proteinPer100g,
      fiberPer100g: request.fiberPer100g,
      sugarPer100g: request.sugarPer100g,
      sodiumMgPer100g: request.sodiumMgPer100g,
      allergyId: null,
      allergyName: null,
      allergyIds: [],
      isVerified: false,
      isUserCreated: true,
      isFavorite: false,
      barcode: null,
      servings: request.servings.map((serving, index) => ({
        id: `s${index}`,
        label: serving.label,
        grams: serving.grams,
      })),
      defaultServingId: 's0',
    };

    expect(fromFoodDto(dto, () => undefined)).toMatchObject({
      verified: false,
      isUserCreated: true,
      nutritionPerServing: { calories: 650, proteinG: 40, carbsG: 70, fatG: 20, sodiumMg: 800 },
      servingOptions: [{ label: '1 phần (130 g)', grams: 130 }],
    });
  });
});
