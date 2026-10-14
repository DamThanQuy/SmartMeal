// DTO của backend cho /mealplanner/* (docs/SmartMeal_API_Contract.md) — chỉ service và mapper import.

export interface PlannedMealItemDto {
  mealPlanId: string;
  /** Breakfast | Lunch | Dinner | Snack. */
  mealType: string;
  recipeId: string;
  recipeTitle: string;
  recipeImageUrl: string | null;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  cookingTimeMinutes: number;
  isCompleted: boolean;
}

export interface DailyPlanDto {
  date: string;
  dayOfWeek: string;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  meals: PlannedMealItemDto[];
}

export interface WeeklyMealPlanDto {
  startDate: string;
  endDate: string;
  targetDailyCalories: number;
  days: DailyPlanDto[];
}

export interface AssignMealPlanRequestDto {
  planDate: string;
  mealType: string;
  recipeId: string;
}

export interface CompleteMealPlanRequestDto {
  isCompleted: boolean;
}

export interface AutoGeneratePlanRequestDto {
  startDate: string;
  targetDailyCalories?: number;
  includeSnack: boolean;
  /** true = chỉ điền ô trống, giữ món người dùng đã chọn (BR-163). */
  keepExisting: boolean;
}
