// DTO của backend cho nhật ký dinh dưỡng và danh mục thực phẩm (docs/fetch-api/part1 Phụ lục A) —
// chỉ service và mapper import file này, hook/screen chỉ biết type FE trong nutrition.types.ts.

/** Một món cần ghi vào nhật ký (dùng chung cho ghi một món và ghi cả bữa). */
export interface DiaryItemInputDto {
  foodName: string;
  recipeId?: string | null;
  /** id thực phẩm trong /foods — cần để tab "Gần đây" tìm thấy món đã ghi. */
  ingredientId?: string | null;
  servingSize: number;
  unit: string;
  calories: number;
  carbsGrams: number;
  fatGrams: number;
  proteinGrams: number;
  /** Manual | AiImage | Voice | Barcode | Ocr */
  logMethod: string;
  imageUrl?: string | null;
}

/**
 * POST /nutritiondiary/log/batch — ghi nhiều món vào cùng một bữa trong một lần gọi: hoặc tất cả
 * được lưu, hoặc không món nào (tối đa 50 món).
 */
export interface LogMealBatchRequestDto {
  /** "yyyy-MM-dd" theo giờ máy. */
  logDate: string;
  /** Breakfast | Lunch | Dinner | Snack (BE không phân biệt hoa/thường, trả về dạng chuẩn). */
  mealType: string;
  items: DiaryItemInputDto[];
}

/** PUT /nutritiondiary/items/{id} — sửa một món; chỉ các trường có mặt mới đổi. */
export interface UpdateDiaryItemRequestDto {
  mealType?: string;
  logDate?: string;
  foodName?: string;
  servingSize?: number;
  unit?: string;
  calories?: number;
  carbsGrams?: number;
  fatGrams?: number;
  proteinGrams?: number;
}

export interface DiaryItemDto {
  id: string;
  foodName: string;
  servingSize: number;
  unit: string;
  calories: number;
  carbsGrams: number;
  fatGrams: number;
  proteinGrams: number;
  logMethod: string;
  /** Bữa chứa món này (dạng chuẩn Breakfast/Lunch/Dinner/Snack). */
  mealType: string;
  /** "yyyy-MM-dd" — ngày của nhật ký chứa món này. */
  logDate: string;
  /** Thời điểm ghi món (ISO 8601 UTC). */
  createdAt: string;
  recipeId: string | null;
  ingredientId: string | null;
  imageUrl: string | null;
}

export interface MealGroupDto {
  mealType: string;
  subtotalCalories: number;
  items: DiaryItemDto[];
}

export interface DailyDiarySummaryDto {
  /** "yyyy-MM-dd". */
  date: string;
  totalCalories: number;
  totalCarbs: number;
  totalFat: number;
  totalProtein: number;
  /** Mục tiêu từ hồ sơ sức khỏe; chưa có hồ sơ → 2000 kcal / 250 C / 55 F / 125 P. */
  targetCalories: number;
  targetCarbs: number;
  targetFat: number;
  targetProtein: number;
  /** Luôn đủ 4 nhóm Breakfast/Lunch/Dinner/Snack, kể cả rỗng. */
  meals: MealGroupDto[];
}

export interface DailyProgressPointDto {
  date: string;
  /** Tiếng Anh ("Monday") — không dùng cho UI. */
  dayOfWeek: string;
  calories: number;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
}

export interface WeeklyProgressDto {
  /** 7 ngày liên tiếp kể từ `startDate`. */
  days: DailyProgressPointDto[];
}

export interface FoodServingDto {
  id: string;
  /** Nhãn khẩu phần, vd. "1 tô". */
  label: string;
  grams: number;
}

/**
 * `/foods` gồm nguyên liệu lẫn món ăn (vd. "Phở bò"); dinh dưỡng tính theo 100 g, khẩu phần nằm ở
 * `servings`. Món do người dùng tự nhập chỉ chủ sở hữu thấy.
 */
export interface FoodItemDto {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** "Dish" với món ăn; nguyên liệu dùng Vegetable/Meat/... */
  category: string;
  defaultUnit: string;
  estimatedPriceVnd: number;
  caloriesPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  proteinPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  sodiumMgPer100g: number;
  /** Chất gây dị ứng chính (giữ để tương thích) — dùng `allergyIds`. */
  allergyId: number | null;
  allergyName: string | null;
  /** id trong /meta/allergies của MỌI chất gây dị ứng trong thực phẩm (BR-101/102). */
  allergyIds: number[];
  /** false với món mẫu chưa rà soát và món người dùng tự nhập (BR-120/121). */
  isVerified: boolean;
  /** Do người dùng tự nhập. */
  isUserCreated: boolean;
  isFavorite: boolean;
  barcode: string | null;
  servings: FoodServingDto[];
  defaultServingId: string | null;
}

/** POST /foods — người dùng tự nhập món (dinh dưỡng trên 100 g, kèm khẩu phần). */
export interface CreateFoodRequestDto {
  name: string;
  description?: string | null;
  category?: string | null;
  barcode?: string | null;
  caloriesPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  proteinPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  sodiumMgPer100g: number;
  servings: { label: string; grams: number; isDefault: boolean }[];
}

export interface FoodFavoriteDto {
  isFavorite: boolean;
}
