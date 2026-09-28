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
  /** Id trong ALLERGY_OPTIONS (features/health) — gắn đúng nguyên liệu gây dị ứng, dùng cho
   * RecipeDetailScreen bản cảnh báo (design/RecipeAllergy.dc.html, BR-101/102/162). */
  allergenId?: string;
  /** true khi chưa rõ đủ thành phần (BR-291) — không được ghi "an toàn" cho nguyên liệu này. */
  unknownComposition?: boolean;
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

// design/CollectionDetail.dc.html, CreateCollection.dc.html (BR-150→152 — business_rule.md
// chưa có đúng số BR này, dựng theo docs/design.md + artboard). recipeIds là nguồn DUY NHẤT xác
// định thành viên bộ sưu tập — không lưu recipeCount tách rời (dễ lệch khi thêm/bớt món).
export interface RecipeCollection {
  id: string;
  name: string;
  recipeIds: string[];
}
