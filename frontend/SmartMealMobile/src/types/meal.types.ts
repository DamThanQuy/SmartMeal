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
