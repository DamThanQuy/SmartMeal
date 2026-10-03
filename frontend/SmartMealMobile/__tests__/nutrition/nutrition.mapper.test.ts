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
  toLogMealRequest,
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
        }),
      ],
    },
    { mealType: 'Snack', subtotalCalories: 0, items: [] },
  ],
};

describe('toLogMealRequest', () => {
  const input: NewMealLogInput = {
    foodName: 'Phở bò tái',
    servingLabel: '1 tô (500 g)',
    grams: 500,
    nutrition: { calories: 450, proteinG: 25, carbsG: 55, fatG: 12 },
    source: 'database',
  };

  test('luôn gửi unit "g" và servingSize = grams, tên bữa PascalCase, ngày theo giờ máy', () => {
    expect(toLogMealRequest('2026-10-02', 'lunch', input)).toEqual({
      logDate: '2026-10-02',
      mealType: 'Lunch',
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

  test.each([
    ['breakfast', 'Breakfast'],
    ['lunch', 'Lunch'],
    ['dinner', 'Dinner'],
    ['snack', 'Snack'],
  ] as const)('bữa %s → %s', (mealType, expected) => {
    expect(toLogMealRequest('2026-10-02', mealType, input).mealType).toBe(expected);
  });

  test('logMethod: mặc định theo source, truyền rõ thì giữ nguyên', () => {
    expect(toLogMealRequest('2026-10-02', 'lunch', { ...input, source: 'ai' }).logMethod).toBe(
      'AiImage',
    );
    expect(toLogMealRequest('2026-10-02', 'lunch', { ...input, source: 'manual' }).logMethod).toBe(
      'Manual',
    );
    expect(
      toLogMealRequest('2026-10-02', 'lunch', { ...input, source: 'ai', logMethod: 'Voice' })
        .logMethod,
    ).toBe('Voice');
    expect(
      toLogMealRequest('2026-10-02', 'lunch', { ...input, logMethod: 'Barcode' }).logMethod,
    ).toBe('Barcode');
  });

  test('ghi lại bản ghi đơn vị khác gram thì giữ nguyên đơn vị', () => {
    expect(toLogMealRequest('2026-10-02', 'dinner', { ...input, grams: 2 }, 'phần')).toMatchObject({
      servingSize: 2,
      unit: 'phần',
    });
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
  test('món tính theo gram: nhãn "450 g", không có giờ ghi, dinh dưỡng làm tròn', () => {
    const entry = fromDiaryItemDto(item(), 'breakfast');

    expect(entry).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      mealType: 'breakfast',
      foodName: 'Bún bò',
      servingLabel: '450 g',
      grams: 450,
      nutrition: { calories: 420, proteinG: 23, carbsG: 46, fatG: 14 },
      source: 'manual',
      aiConfirmed: false,
    });
    expect(entry.unit).toBeUndefined();
    expect(entry.loggedAt).toBeUndefined();
  });

  test('nutritionPerGram tính từ số thực của BE, không từ số đã làm tròn', () => {
    const entry = fromDiaryItemDto(item({ servingSize: 3, calories: 1.4, proteinGrams: 0.4 }), 'snack');

    expect(entry.nutrition.calories).toBe(1);
    expect(entry.nutrition.proteinG).toBe(0);
    expect(entry.nutritionPerGram.calories).toBeCloseTo(1.4 / 3, 10);
    expect(entry.nutritionPerGram.proteinG).toBeCloseTo(0.4 / 3, 10);
  });

  test('bản ghi do nơi khác tạo với đơn vị "phần": giữ đơn vị, số lượng thành "grams"', () => {
    const entry = fromDiaryItemDto(
      item({ servingSize: 1.5, unit: 'phần', calories: 300 }),
      'dinner',
    );

    expect(entry.servingLabel).toBe('1.5 phần');
    expect(entry.unit).toBe('phần');
    expect(entry.grams).toBe(1.5);
    expect(entry.nutritionPerGram.calories).toBe(200);
  });

  test('servingSize không hợp lệ (0) được coi là 1 để không chia cho 0', () => {
    const entry = fromDiaryItemDto(item({ servingSize: 0, unit: '' }), 'lunch');

    expect(entry.grams).toBe(1);
    expect(entry.servingLabel).toBe('1 g');
    expect(Number.isFinite(entry.nutritionPerGram.calories)).toBe(true);
  });

  test('bản ghi vừa tạo có giờ ghi; AI → đã xác nhận', () => {
    const entry = fromDiaryItemDto(
      item({ logMethod: 'AiImage' }),
      'lunch',
      '2026-10-02T05:30:00.000Z',
    );

    expect(entry.loggedAt).toBe('2026-10-02T05:30:00.000Z');
    expect(entry).toMatchObject({ source: 'ai', aiConfirmed: true });
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
  // 26/09/2026 là thứ Bảy → 02/10/2026 là thứ Sáu.
  const days = [
    ['2026-09-26', 'Saturday', 0],
    ['2026-09-27', 'Sunday', 1800.4],
    ['2026-09-28', 'Monday', 2100],
    ['2026-09-29', 'Tuesday', 0],
    ['2026-09-30', 'Wednesday', 1500],
    ['2026-10-01', 'Thursday', 1990],
    ['2026-10-02', 'Friday', 1200],
  ] as const;
  const dto: WeeklyProgressDto = {
    days: days.map(([date, dayOfWeek, calories]) => ({
      date,
      dayOfWeek,
      calories,
      targetCalories: 1775.6,
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

  test('chưa có macro theo ngày → averageMacros rỗng (UI ẩn khối này)', () => {
    expect(fromWeeklyProgressDto(dto, '2026-10-02').averageMacros).toEqual([]);
  });

  test('tuần chưa ghi gì → trung bình 0, không chia cho 0', () => {
    const empty = fromWeeklyProgressDto(
      { days: dto.days.map(day => ({ ...day, calories: 0 })) },
      '2026-10-02',
    );

    expect(empty.averageCalories).toBe(0);
    expect(empty.daysOnTarget).toBe(0);
  });

  test('BE không trả ngày nào → không ném lỗi', () => {
    expect(fromWeeklyProgressDto({ days: [] }, '2026-10-02')).toMatchObject({
      rangeLabel: '',
      calorieTarget: 0,
      days: [],
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
  };
  const resolveSlug = (id: number) => (id === 2 ? 'peanut' : undefined);

  test('dinh dưỡng theo 100 g, khẩu phần mặc định "100 g", dữ liệu đã xác minh', () => {
    expect(fromFoodDto(food, resolveSlug)).toEqual({
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Ức gà',
      verified: true,
      servingOptions: [{ id: 'g-100', label: '100 g', grams: 100 }],
      defaultServingId: 'g-100',
      nutritionPerServing: {
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        sugarG: 0,
        sodiumMg: 74,
        fiberG: 0,
      },
      allergenIds: undefined,
    });
  });

  test('id dị ứng của BE → slug FE; id lạ hoặc null → không có cảnh báo', () => {
    expect(fromFoodDto({ ...food, allergyId: 2 }, resolveSlug).allergenIds).toEqual(['peanut']);
    expect(fromFoodDto({ ...food, allergyId: 99 }, resolveSlug).allergenIds).toBeUndefined();
    expect(fromFoodDto(food, resolveSlug).allergenIds).toBeUndefined();
  });
});
