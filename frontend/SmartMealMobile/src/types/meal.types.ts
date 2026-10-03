// BR-051 — Loại bữa ăn: tối thiểu 4 bữa (Breakfast, Lunch, Dinner, Snack). Dùng chung cho
// dashboard, nutrition, ai (mọi nơi cần gắn 1 bản ghi với 1 bữa) — đặt ở src/types theo
// .claude/rules/typescript-mobile.md ("Type dùng chung toàn app → src/types/").
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealTypeOption {
  id: MealType;
  label: string;
}

// Nhãn ngắn dùng cho chip chọn bữa (QuickLog, FoodDetail, EditMealLog).
export const MEAL_TYPE_OPTIONS: MealTypeOption[] = [
  { id: 'breakfast', label: 'Sáng' },
  { id: 'lunch', label: 'Trưa' },
  { id: 'dinner', label: 'Tối' },
  { id: 'snack', label: 'Phụ' },
];

// Tiêu đề đầy đủ dùng cho section header (Diary, Dashboard).
export const MEAL_TYPE_TITLES: Record<MealType, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Bữa phụ',
};

export function getMealTypeForHour(hour: number): MealType {
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

/**
 * Giá trị MealType phía backend (PascalCase). BE coi mealType là string tự do, không validate —
 * gửi sai hoa/thường (vd. `breakfast`) sẽ tạo bản ghi nhật ký riêng và món có thể không hiện trong
 * `/nutritiondiary/daily` (docs/fetch-api/part1 §3.6).
 */
export type ApiMealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

const API_MEAL_TYPE: Record<MealType, ApiMealType> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function toApiMealType(mealType: MealType): ApiMealType {
  return API_MEAL_TYPE[mealType];
}

/** So khớp không phân biệt hoa/thường; giá trị lạ rơi về 'snack' (bữa phụ). */
export function fromApiMealType(value: string): MealType {
  const normalized = value.trim().toLowerCase();
  return MEAL_TYPES.find(mealType => mealType === normalized) ?? 'snack';
}
