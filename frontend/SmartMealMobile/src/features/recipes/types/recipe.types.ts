import type { NutritionInfo } from '@/features/nutrition';
import type { MealType } from '@/types/meal.types';

// BR-090 — Food & Recipe Database. BR-100 — Dietary Preference. Tag dùng lại đúng id của
// DIETARY_PREFERENCE_OPTIONS (features/health/types) + 'quick' (Nhanh, ≤15 phút — chỉ dùng
// cho lọc UI, không phải chế độ ăn). Id trùng `code` của /meta/tags trên backend.
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
  /** Id trong ALLERGY_OPTIONS (features/health) của mọi chất gây dị ứng trong nguyên liệu này
   * (BR-101/102/162) — RecipeDetailScreen bản cảnh báo gắn tag theo danh sách này. */
  allergenIds: string[];
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
  description?: string;
  /** Ảnh món (URL tuyệt đối); không có thì hiện placeholder. */
  imageUrl?: string;
  durationMinutes: number;
  /** Điểm đánh giá — backend chưa có hệ thống đánh giá nên chỉ có ở dữ liệu mẫu; không có thì ẩn. */
  rating?: number;
  /** Số phần dinh dưỡng/nguyên liệu bên dưới đang tính theo. */
  servings: number;
  nutritionPerServing: NutritionInfo;
  tags: RecipeTag[];
  /** Bữa phù hợp; rỗng = mọi bữa. */
  mealTypes: MealType[];
  isPremium?: boolean;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  /** Id trong ALLERGY_OPTIONS (features/health) — dùng loại/cảnh báo theo BR-101/102. */
  allergenIds: string[];
  /** Cảnh báo theo bệnh lý người dùng đã khai báo (BR-110/111), do backend tính. */
  healthWarnings: string[];
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
  mealType?: MealType;
}

// design/CollectionDetail.dc.html, CreateCollection.dc.html (BR-150→152 — business_rule.md
// chưa có đúng số BR này, dựng theo docs/design.md + artboard). `recipes` là nguồn DUY NHẤT xác
// định thành viên bộ sưu tập — không lưu số món tách rời (dễ lệch khi thêm/bớt món).
export interface RecipeCollection {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  /** Công khai = mọi người dùng thấy trong danh sách bộ sưu tập (chỉ xem). */
  isPublic: boolean;
  /** Chỉ chủ sở hữu được đổi tên/xóa/thêm-bớt món (BR-152). */
  isOwner: boolean;
  /** Mã liên kết chia sẻ đang bật (chỉ chủ sở hữu thấy); null = chưa chia sẻ bằng liên kết. */
  shareToken: string | null;
  recipes: Recipe[];
}

/** Liên kết chia sẻ chỉ đọc: ai có mã đều xem được, kể cả khi bộ sưu tập riêng tư; chủ sở hữu tắt được. */
export interface CollectionShareLink {
  shareToken: string;
  sharedAtIso: string;
}

export interface NewCollectionInput {
  name: string;
  isPublic: boolean;
}

export interface CollectionUpdate {
  name?: string;
  isPublic?: boolean;
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedCount: number;
  totalIngredients: number;
}

export interface FavoriteToggleResult {
  isFavorite: boolean;
  totalFavorites: number;
}

export interface RecommendedRecipes {
  recipes: Recipe[];
  /** Dị ứng đã dùng để loại món (theo hồ sơ người dùng) — để màn hình ghi rõ "Đã loại món chứa …". */
  excludedAllergenIds: string[];
}
