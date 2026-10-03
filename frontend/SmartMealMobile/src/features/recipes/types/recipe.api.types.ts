export interface RecipeIngredientApiDto {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  estimatedPriceVnd: number;
}

export interface RecipeApiDto {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
  isPremium: boolean;
  caloriesPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  proteinPerServing: number;
  tags: string[];
  ingredients: RecipeIngredientApiDto[];
}

export interface FoodApiDto {
  id: string;
  name: string;
  allergyId: number | null;
}

export interface FoodPageApiDto {
  items: FoodApiDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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
  recipes: RecipeApiDto[];
}

export interface CreateCollectionRequest {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic: boolean;
}
