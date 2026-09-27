import type { NutritionInfo } from '@/features/nutrition';

// BR-090 — Food & Recipe Database. BR-100 — Dietary Preference. Tag dùng lại đúng id của
// DIETARY_PREFERENCE_OPTIONS (features/health/types) + 'quick' (Nhanh, ≤15 phút — chỉ dùng
// cho lọc UI, không phải chế độ ăn).
export type RecipeTag =
  | 'eatClean'
  | 'lowCarb'
  | 'keto'
  | 'vegan'
  | 'vegetarian'
  | 'quick';

export interface RecipeIngredient {
  name: string;
  amount: string;
}

export interface RecipeStep {
  order: number;
  instruction: string;
}

export interface Recipe {
  id: string;
  name: string;
  durationMinutes: number;
  rating: number;
  /** Số phần dinh dưỡng/nguyên liệu bên dưới đang tính theo. */
  servings: number;
  nutritionPerServing: NutritionInfo;
  tags: RecipeTag[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  /** Id trong ALLERGY_OPTIONS (features/health) — dùng loại/cảnh báo theo BR-101/102. */
  allergenIds: string[];
}

export interface RecipeTagOption {
  id: RecipeTag;
  label: string;
}

// design/Discovery.dc.html, FilterSheet.dc.html.
export const RECIPE_TAG_OPTIONS: RecipeTagOption[] = [
  { id: 'eatClean', label: 'Eat Clean' },
  { id: 'lowCarb', label: 'Low Carb' },
  { id: 'keto', label: 'Keto' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'quick', label: 'Nhanh' },
];

export type CookTimeFilter = '15' | '30' | '60';
export type CalorieFilter = 'under300' | '300to500' | 'over500';

export interface RecipeFilters {
  tag?: RecipeTag;
  cookTime?: CookTimeFilter;
  calorie?: CalorieFilter;
}

export interface RecipeCollection {
  id: string;
  name: string;
  recipeCount: number;
}
