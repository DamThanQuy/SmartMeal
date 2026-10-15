/**
 * ProgressChart tab "Ngày" (tính từ nhật ký một ngày) và "Tháng" (GET /nutritiondiary/progress),
 * cùng hàm chọn món cho "Thêm món AI bỏ sót".
 */
import { fromMonthlyProgressDto } from '@/features/nutrition/services/nutrition.mapper';
import type { WeeklyProgressDto } from '@/features/nutrition/types/nutrition.api.types';
import type {
  DiaryDaySummary,
  FoodItem,
  MealLogEntry,
  NutritionInfo,
} from '@/features/nutrition/types/nutrition.types';
import { pickedFoodFromItem } from '@/features/nutrition/utils/pickedFood';
import { buildDayProgress } from '@/features/nutrition/utils/progress';
import type { MealType } from '@/types/meal.types';

function nutrition(calories: number, proteinG: number, carbsG: number, fatG: number): NutritionInfo {
  return { calories, proteinG, carbsG, fatG };
}

function entry(mealType: MealType, value: NutritionInfo): MealLogEntry {
  return {
    id: `${mealType}-${value.calories}`,
    mealType,
    foodName: 'Món',
    servingLabel: '100 g',
    grams: 100,
    nutrition: value,
    nutritionPerGram: value,
    source: 'manual',
  };
}

describe('buildDayProgress', () => {
  const diary: DiaryDaySummary = {
    date: '2026-10-14',
    calorieTarget: 1800,
    activityCalories: 200,
    entriesByMeal: {
      breakfast: [entry('breakfast', nutrition(350.4, 20, 40, 10))],
      lunch: [entry('lunch', nutrition(500, 30, 60, 15)), entry('lunch', nutrition(120, 2, 25, 1))],
      dinner: [],
      snack: [entry('snack', nutrition(80, 1, 18, 0.4))],
    },
    macroTargets: { proteinG: 110, carbsG: 220, fatG: 60 },
  };

  test('calo từng bữa theo thứ tự Sáng–Trưa–Tối–Phụ, tổng và ngân sách gồm calo vận động', () => {
    const summary = buildDayProgress(diary);

    expect(summary.meals.map(meal => [meal.label, meal.calories])).toEqual([
      ['Sáng', 350],
      ['Trưa', 620],
      ['Tối', 0],
      ['Phụ', 80],
    ]);
    expect(summary.totalCalories).toBe(1050);
    expect(summary.calorieBudget).toBe(2000);
  });

  test('macro cộng dồn cả ngày so với mục tiêu', () => {
    expect(buildDayProgress(diary).macros).toEqual([
      { label: 'Protein', consumedG: 53, targetG: 110 },
      { label: 'Carbs', consumedG: 143, targetG: 220 },
      { label: 'Fat', consumedG: 26, targetG: 60 },
    ]);
  });
});

describe('fromMonthlyProgressDto', () => {
  // 30 ngày kết thúc 14/10/2026; chỉ vài ngày có ghi.
  const start = new Date(2026, 8, 15);
  const dto: WeeklyProgressDto = {
    days: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const calories = index === 0 ? 1500 : index === 10 ? 2600 : index === 29 ? 1800 : 0;
      return {
        date: iso,
        dayOfWeek: 'Monday',
        calories,
        targetCalories: 2000,
        proteinGrams: calories > 0 ? 100 : 0,
        carbsGrams: calories > 0 ? 200 : 0,
        fatGrams: calories > 0 ? 50 : 0,
        targetProteinGrams: 120,
        targetCarbsGrams: 250,
        targetFatGrams: 65,
      };
    }),
  };

  test('nhãn ngày trong tháng mỗi 5 ngày và ngày cuối, các ngày khác để trống', () => {
    const summary = fromMonthlyProgressDto(dto, '2026-10-14');

    expect(summary.days).toHaveLength(30);
    expect(summary.days.filter(day => day.label !== '').map(day => day.label)).toEqual([
      '15', '20', '25', '30', '5', '10', '14',
    ]);
    expect(summary.days[29].isToday).toBe(true);
    expect(summary.rangeLabel).toBe('15/09–14/10');
  });

  test('trung bình và ngày đạt mục tiêu chỉ tính các ngày đã ghi', () => {
    const summary = fromMonthlyProgressDto(dto, '2026-10-14');

    expect(summary.averageCalories).toBe(1967);
    expect(summary.daysOnTarget).toBe(2);
  });
});

describe('pickedFoodFromItem', () => {
  const food: FoodItem = {
    id: 'food-1',
    name: 'Cơm trắng',
    verified: true,
    servingOptions: [
      { id: 's-100', label: '100 g', grams: 100 },
      { id: 's-bowl', label: '1 chén (150 g)', grams: 150 },
    ],
    defaultServingId: 's-bowl',
    nutritionPerServing: nutrition(195, 4, 42, 0.5),
  };

  test('lấy khẩu phần mặc định và dinh dưỡng của khẩu phần đó, key duy nhất theo thời điểm chọn', () => {
    expect(pickedFoodFromItem(food, 123)).toEqual({
      key: 'food-1-123',
      foodId: 'food-1',
      foodName: 'Cơm trắng',
      servingLabel: '1 chén (150 g)',
      grams: 150,
      nutrition: nutrition(195, 4, 42, 0.5),
    });
  });
});
