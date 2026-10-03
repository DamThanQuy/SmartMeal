// DTO của backend cho nhật ký dinh dưỡng và danh mục thực phẩm (docs/fetch-api/part1 Phụ lục A) —
// chỉ service và mapper import file này, hook/screen chỉ biết type FE trong nutrition.types.ts.

export interface LogMealRequestDto {
  /** "yyyy-MM-dd" theo giờ máy. */
  logDate: string;
  /** Breakfast | Lunch | Dinner | Snack — BE so khớp chuỗi, phải đúng hoa/thường. */
  mealType: string;
  foodName: string;
  recipeId?: string | null;
  ingredientId?: string | null;
  servingSize: number;
  unit: string;
  calories: number;
  carbsGrams: number;
  fatGrams: number;
  proteinGrams: number;
  /** Manual | AiImage | Voice | Barcode */
  logMethod: string;
  imageUrl?: string | null;
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
}

export interface WeeklyProgressDto {
  /** 7 ngày liên tiếp kể từ `startDate`. */
  days: DailyProgressPointDto[];
}

/** `/foods` thực chất là bảng nguyên liệu (Ingredient); dinh dưỡng tính theo 100 g. */
export interface FoodItemDto {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
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
  /** id int của /meta/allergies. */
  allergyId: number | null;
  allergyName: string | null;
}
