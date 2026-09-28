import type { MealType } from '@/types/meal.types';
import { MEAL_TYPES } from '@/types/meal.types';
import type { MealLogEntry, NutritionInfo } from '../types/nutrition.types';
import { nutritionPerGram } from '../utils/nutritionMath';

// Mục tiêu ngày của user hiện tại (mock) — khớp design/Dashboard.dc.html, Diary.dc.html,
// ProgressChart.dc.html (2.000 kcal, macro 120/250/65g).
// TODO: khi Đợt 7 (HealthSettings) có store hồ sơ user đã đăng nhập, thay hằng số này bằng
// giá trị đọc từ đó thay vì hard-code ở đây.
export const CURRENT_USER_DAILY_TARGET = {
  calorieTarget: 2000,
  macroTargets: { proteinG: 120, carbsG: 250, fatG: 65 },
};

// design/CalorieBudget.dc.html "Nguồn vận động" — nguồn Health Connect duy nhất được TÍNH vào
// ngân sách hôm nay (đồng hồ thông minh báo cùng khung giờ nên bị bỏ qua, BR-042). Đây là
// nguồn RAW duy nhất — nutritionService.buildSummary()/dashboard.mock.ts đều đọc từ đây thay vì
// tự khai 1 hằng số 180 riêng (từng bị lệch/trùng trước Đợt 11).
export const TODAY_ACTIVITY_CALORIES_BURNED_MOCK = 180;

let seedCounter = 0;
function nextId(prefix: string): string {
  seedCounter += 1;
  return `${prefix}-${seedCounter}`;
}

function buildEntry(
  mealType: MealType,
  foodName: string,
  servingLabel: string,
  grams: number,
  nutrition: NutritionInfo,
  loggedAt: string,
  aiConfirmed = false,
): MealLogEntry {
  return {
    id: nextId('seed'),
    mealType,
    foodName,
    servingLabel,
    grams,
    nutrition,
    nutritionPerGram: nutritionPerGram(nutrition, grams),
    source: aiConfirmed ? 'ai' : 'manual',
    aiConfirmed,
    loggedAt,
  };
}

/** design/Diary.dc.html — dữ liệu "hôm nay" đã ghi sẵn (Sáng + Trưa từ AI, Phụ ghi thủ công). */
export function createTodaySeedEntries(dateIso: string): Record<MealType, MealLogEntry[]> {
  const empty: Record<MealType, MealLogEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  MEAL_TYPES.forEach(type => {
    empty[type] = [];
  });

  empty.breakfast = [
    buildEntry(
      'breakfast',
      'Bún bò',
      '1 tô',
      450,
      { calories: 420, proteinG: 23, carbsG: 46, fatG: 14, sugarG: 3, sodiumMg: 1400, fiberG: 2 },
      `${dateIso}T07:15:00`,
      true,
    ),
    buildEntry(
      'breakfast',
      'Nước cam',
      '1 ly · 250 ml',
      250,
      { calories: 110, proteinG: 1, carbsG: 26, fatG: 0, sugarG: 22, sodiumMg: 5, fiberG: 0 },
      `${dateIso}T07:16:00`,
      true,
    ),
  ];

  empty.lunch = [
    buildEntry(
      'lunch',
      'Cơm trắng',
      '1 chén · 150 g',
      150,
      { calories: 195, proteinG: 4, carbsG: 43, fatG: 0, sugarG: 0, sodiumMg: 5, fiberG: 1 },
      `${dateIso}T12:05:00`,
      true,
    ),
    buildEntry(
      'lunch',
      'Gà kho',
      '120 g',
      120,
      { calories: 280, proteinG: 25, carbsG: 8, fatG: 15, sugarG: 4, sodiumMg: 620, fiberG: 0 },
      `${dateIso}T12:06:00`,
      true,
    ),
    buildEntry(
      'lunch',
      'Canh cải',
      '1 bát',
      200,
      { calories: 45, proteinG: 3, carbsG: 7, fatG: 1, sugarG: 2, sodiumMg: 380, fiberG: 2 },
      `${dateIso}T12:07:00`,
      true,
    ),
  ];

  empty.snack = [
    buildEntry(
      'snack',
      'Sữa chua',
      '1 hộp',
      100,
      { calories: 150, proteinG: 4, carbsG: 4, fatG: 5, sugarG: 12, sodiumMg: 60, fiberG: 0 },
      `${dateIso}T15:30:00`,
    ),
    buildEntry(
      'snack',
      'Hạt điều',
      '30 g',
      30,
      { calories: 165, proteinG: 4, carbsG: 5, fatG: 5, sugarG: 1, sodiumMg: 45, fiberG: 1 },
      `${dateIso}T15:31:00`,
    ),
    buildEntry(
      'snack',
      'Táo',
      '1 quả',
      180,
      { calories: 55, proteinG: 1, carbsG: 1, fatG: 2, sugarG: 12, sodiumMg: 2, fiberG: 3 },
      `${dateIso}T15:32:00`,
    ),
  ];

  empty.dinner = [];

  return empty;
}
