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
export type MealLogMethod = 'Manual' | 'AiImage' | 'Voice' | 'Barcode' | 'Ocr';

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
  /** Món nằm trong danh sách yêu thích của người dùng (chỉ có khi nguồn là backend). */
  isFavorite?: boolean;
}

export interface NewFoodInput {
  name: string;
  amount: number;
  unit: 'g' | 'ml' | 'phần';
  nutrition: NutritionInfo;
  /** Mã vạch khi nhập từ màn "Không tìm thấy sản phẩm" — lần quét sau tìm thấy món này (BR-120). */
  barcode?: string;
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
  /** Giờ ghi (ISO) — backend lưu và trả `createdAt` của món. */
  loggedAt?: string;
  /** Ảnh món (AI Snap) backend đã lưu. */
  imageUrl?: string;
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
  /** id thực phẩm trong /foods khi món lấy từ danh mục — để tab "Gần đây" nhớ món đã ghi. */
  ingredientId?: string;
  /** id công thức khi ghi từ một công thức. */
  recipeId?: string;
  /** Ảnh món đã chụp (URL backend trả ở /ai/snap-and-track) — nhật ký hiện lại ảnh này. */
  imageUrl?: string;
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
  /** Calo cộng thêm từ vận động (health-sync của backend) — design/Dashboard.dc.html "+ Vận động". */
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
  /** Nhãn trục X: thứ ("T2") ở biểu đồ tuần; ngày trong tháng ("15") hoặc rỗng ở biểu đồ tháng. */
  label: string;
  calories: number;
  isToday?: boolean;
}

/** Tiến độ nhiều ngày — dùng cho cả tab "Tuần" (7 ngày) và "Tháng" (30 ngày). */
export interface WeeklyProgressSummary {
  rangeLabel: string;
  calorieTarget: number;
  days: WeeklyProgressDay[];
  averageCalories: number;
  daysOnTarget: number;
  /** Trung bình macro các ngày đã ghi (rỗng nếu tuần chưa ghi gì — UI ẩn khối này). */
  averageMacros: MacroTargetProgress[];
}

export interface DayMealCalories {
  mealType: MealType;
  label: string;
  calories: number;
}

/**
 * Món người dùng tự chọn trong FoodSearch (chế độ chọn) để bổ sung vào danh sách đang duyệt của
 * AI Snap — "Thêm món AI bỏ sót". Khẩu phần mặc định của món; user chỉnh gram ở màn kết quả.
 */
export interface PickedFood {
  /** Duy nhất cho mỗi lần chọn (chọn cùng một món hai lần = hai dòng). */
  key: string;
  foodId: string;
  foodName: string;
  servingLabel: string;
  grams: number;
  nutrition: NutritionInfo;
}

/** Tab "Ngày" của ProgressChart — tính từ nhật ký một ngày (GET /nutritiondiary/daily). */
export interface DayProgressSummary {
  calorieBudget: number;
  totalCalories: number;
  meals: DayMealCalories[];
  macros: MacroTargetProgress[];
}
