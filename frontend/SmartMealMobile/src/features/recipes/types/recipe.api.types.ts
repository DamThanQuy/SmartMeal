// DTO của backend cho /recipes/* (docs/SmartMeal_API_Contract.md) — chỉ service và mapper import file
// này; hook/screen chỉ biết type FE trong recipe.types.ts.

export interface RecipeIngredientApiDto {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  estimatedPriceVnd: number;
  /** Id /meta/allergies của nguyên liệu này. */
  allergyIds: number[];
}

export interface RecipeApiDto {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  servings: number;
  difficulty: string;
  isPremium: boolean;
  caloriesPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  proteinPerServing: number;
  /** Tên hiển thị của tag. */
  tags: string[];
  /** Mã ổn định của tag (cùng thứ tự với `tags`), khớp `code` ở /meta/tags. */
  tagCodes: string[];
  /** Breakfast | Lunch | Dinner | Snack; rỗng = mọi bữa. */
  mealTypes: string[];
  /** Id /meta/allergies của mọi chất gây dị ứng trong công thức. */
  allergyIds: number[];
  isFavorite: boolean;
  /** Cảnh báo theo bệnh lý của người đang đăng nhập (BR-110/111). */
  healthWarnings: string[];
  ingredients: RecipeIngredientApiDto[];
}

/** GET /recipes — tham số lọc (BE trả mảng; không gửi page/pageSize = trả tất cả). */
export interface RecipeQueryParams {
  tag?: string;
  maxCalories?: number;
  mealType?: string;
  maxCookTimeMinutes?: number;
  /** Cần token — BE loại món chứa dị ứng của người dùng (BR-101/102). */
  excludeMyAllergens?: boolean;
}

export interface PantrySuggestionRequest {
  availableIngredients: string[];
}

export interface FavoriteToggleApiDto {
  isFavorite: boolean;
  totalFavorites: number;
}

export interface RecipeCollectionApiDto {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  recipeCount: number;
  isPublic: boolean;
  ownerId: string;
  isOwner: boolean;
  /** Chỉ có với chủ sở hữu; null = chưa chia sẻ bằng liên kết. */
  shareToken?: string | null;
  recipes: RecipeApiDto[];
}

/** POST /recipes/collections/{id}/share. */
export interface CollectionShareApiDto {
  shareToken: string;
  sharedAt: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic: boolean;
}

/** PATCH /recipes/collections/{id} — chỉ đổi các trường có mặt. */
export interface UpdateCollectionRequest {
  name?: string;
  isPublic?: boolean;
}

export interface AddRecipeToCollectionRequest {
  recipeId: string;
}
