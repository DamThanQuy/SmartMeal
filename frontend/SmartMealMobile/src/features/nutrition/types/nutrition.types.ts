import type { MealType } from '@/types/meal.types';

// BR-050 — Cấu trúc Meal Log: User, Ngày, Bữa ăn, Thực phẩm/Recipe, Khối lượng/Serving,
// Thông tin dinh dưỡng. BR-090 — Food & Recipe Database lưu dinh dưỡng theo serving size.

export interface NutritionInfo {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG?: number;
  sodiumMg?: number;
  fiberG?: number;
}

export type FoodLogSource = 'database' | 'ai' | 'manual';

/**
 * Cách ghi món mà backend lưu (`logMethod`). FoodLogSource không phân biệt ảnh/giọng nói/mã vạch,
 * nên luồng AI/Scanner truyền thêm giá trị này khi cần.
 */
export type MealLogMethod = 'Manual' | 'AiImage' | 'Voice' | 'Barcode';

export type FoodSearchFilter = 'all' | 'recent' | 'favorite' | 'mine';

export interface FoodServingOption {
  id: string;
  /** Nhãn hiển thị đầy đủ, vd. "1 tô (500 g)" — design/FoodDetail.dc.html. */
  label: string;
  grams: number;
}

export interface FoodItem {
  id: string;
  name: string;
  /** "Dữ liệu đã xác minh" badge — design/FoodSearch.dc.html, FoodDetail.dc.html. */
  verified: boolean;
  servingOptions: FoodServingOption[];
  defaultServingId: string;
  /** Dinh dưỡng ứng với serving mặc định (defaultServingId). */
  nutritionPerServing: NutritionInfo;
  /** Id trong ALLERGY_OPTIONS (features/health/types) — dùng cảnh báo dị ứng BR-101/102. */
  allergenIds?: string[];
  /** true khi món do chính user nhập tay (CreateFoodScreen, BR-121) — hiển thị nhãn "Do bạn
   * nhập", không tính là dữ liệu đã xác minh (verified luôn false với món này). */
  isUserCreated?: boolean;
}

export interface NewFoodInput {
  name: string;
  amount: number;
  unit: 'g' | 'ml' | 'phần';
  nutrition: NutritionInfo;
}

export interface MealLogEntry {
  id: string;
  mealType: MealType;
  foodName: string;
  /** Nhãn khối lượng hiển thị, vd. "1 tô", "150 g", "1 ly · 250 ml". */
  servingLabel: string;
  /** Khối lượng gốc dùng để tính lại dinh dưỡng khi sửa (EditMealLog) — tính theo gram (hoặc theo
   * `unit` khi bản ghi do nơi khác tạo với đơn vị khác). */
  grams: number;
  /** Đơn vị của `grams`; mặc định 'g'. Chỉ khác 'g' với bản ghi tải từ backend do nơi khác tạo
   * (vd. 'phần'). */
  unit?: string;
  nutrition: NutritionInfo;
  /** Dinh dưỡng ứng với 1 gram — dùng để scale lại khi user đổi khối lượng (BR-053). */
  nutritionPerGram: NutritionInfo;
  source: FoodLogSource;
  /** true khi bản ghi đến từ luồng AI Analysis → User Review → User Confirm (BR-054). */
  aiConfirmed?: boolean;
  /** Giờ ghi (ISO). Bản ghi tải về từ backend không có (BE không lưu/không trả giờ ghi) → UI ẩn
   * giờ khi thiếu. */
  loggedAt?: string;
}

/** Dữ liệu 1 món để ghi vào nhật ký (BR-052 ghi thủ công, BR-054 AI Confirm → Save). */
export interface NewMealLogInput {
  foodName: string;
  servingLabel: string;
  grams: number;
  nutrition: NutritionInfo;
  source: FoodLogSource;
  aiConfirmed?: boolean;
  /** Mặc định: 'AiImage' khi source = 'ai', ngược lại 'Manual'. Barcode/Voice truyền rõ. */
  logMethod?: MealLogMethod;
}

export interface MacroTargetProgress {
  label: string;
  consumedG: number;
  targetG: number;
}

export interface DiaryDaySummary {
  /** ISO date yyyy-MM-dd. */
  date: string;
  calorieTarget: number;
  /** Calo cộng thêm từ vận động (Health Connect mock) — design/Dashboard.dc.html "+ Vận động". */
  activityCalories: number;
  entriesByMeal: Record<MealType, MealLogEntry[]>;
  macroTargets: {
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

export interface WeeklyProgressDay {
  /** ISO date yyyy-MM-dd. */
  date: string;
  label: string;
  calories: number;
  isToday?: boolean;
}

export interface WeeklyProgressSummary {
  rangeLabel: string;
  calorieTarget: number;
  days: WeeklyProgressDay[];
  averageCalories: number;
  daysOnTarget: number;
  /** Rỗng khi backend chưa có số liệu macro theo ngày (P1-BE-07) — UI ẩn khối này. */
  averageMacros: MacroTargetProgress[];
}
