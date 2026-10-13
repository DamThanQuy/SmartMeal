import type { MetaCatalog } from '@/features/health';
import { MEAL_TYPES, toApiMealType, type MealType } from '@/types/meal.types';
import type {
  Recipe,
  RecipeCollection,
  RecipeFilters,
  RecipeStep,
  RecipeTag,
} from '../types/recipe.types';
import type {
  RecipeApiDto,
  RecipeCollectionApiDto,
  RecipeQueryParams,
} from '../types/recipe.api.types';

// Quy đổi DTO /recipes/* ↔ type FE. Dị ứng và tag ánh xạ theo `code` ổn định của /meta/* (không
// hard-code id), nên thêm mục mới ở BE không làm lệch.

const RECIPE_TAGS: readonly RecipeTag[] = ['eatClean', 'lowCarb', 'keto', 'vegan', 'vegetarian', 'quick'];

function isRecipeTag(code: string): code is RecipeTag {
  return (RECIPE_TAGS as readonly string[]).includes(code);
}

function toMealType(value: string): MealType | undefined {
  const normalized = value.trim().toLowerCase();
  return MEAL_TYPES.find(mealType => mealType === normalized);
}

/** Id dị ứng của BE → code FE; id FE chưa biết bị bỏ (người dùng cũng không thể khai báo dị ứng đó trên app). */
function allergyCodes(ids: readonly number[], catalog: MetaCatalog): string[] {
  const codes = ids
    .map(id => catalog.allergies.codeById(id))
    .filter((code): code is string => code !== undefined);
  return Array.from(new Set(codes));
}

/** Chỉ nhận URL ảnh tuyệt đối http(s); còn lại để màn hình hiện placeholder. */
function imageUrlOf(value: string | null): string | undefined {
  return value && /^https?:\/\//i.test(value) ? value : undefined;
}

export function formatAmount(amount: number, unit: string): string {
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount * 10) / 10;
  return `${rounded} ${unit}`.trim();
}

/** BE lưu các bước là một chuỗi, mỗi bước một dòng (thường có tiền tố "1. "). */
export function parseInstructions(instructions: string): RecipeStep[] {
  return instructions
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ order: index + 1, instruction: line.replace(/^\d+[.)]\s*/, '') }));
}

export function fromRecipeDto(dto: RecipeApiDto, catalog: MetaCatalog): Recipe {
  return {
    id: dto.id,
    name: dto.title,
    description: dto.description ?? undefined,
    imageUrl: imageUrlOf(dto.imageUrl),
    durationMinutes: dto.totalTimeMinutes || dto.prepTimeMinutes + dto.cookTimeMinutes,
    servings: dto.servings > 0 ? dto.servings : 1,
    nutritionPerServing: {
      calories: Math.round(dto.caloriesPerServing),
      proteinG: Math.round(dto.proteinPerServing),
      carbsG: Math.round(dto.carbsPerServing),
      fatG: Math.round(dto.fatPerServing),
    },
    tags: dto.tagCodes.filter(isRecipeTag),
    mealTypes: dto.mealTypes.map(toMealType).filter((mealType): mealType is MealType => Boolean(mealType)),
    isPremium: dto.isPremium,
    ingredients: dto.ingredients.map(ingredient => ({
      name: ingredient.name,
      amount: formatAmount(ingredient.amount, ingredient.unit),
      allergenIds: allergyCodes(ingredient.allergyIds, catalog),
    })),
    steps: parseInstructions(dto.instructions),
    allergenIds: allergyCodes(dto.allergyIds, catalog),
    healthWarnings: dto.healthWarnings,
  };
}

export function fromCollectionDto(dto: RecipeCollectionApiDto, catalog: MetaCatalog): RecipeCollection {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? undefined,
    coverImageUrl: imageUrlOf(dto.coverImageUrl),
    isPublic: dto.isPublic,
    isOwner: dto.isOwner,
    recipes: dto.recipes.map(recipe => fromRecipeDto(recipe, catalog)),
  };
}

/**
 * Bộ lọc FE → tham số GET /recipes. Cận dưới của khoảng calo BE không hỗ trợ nên vẫn lọc ở FE
 * (`matchesCalorieFilter`). `excludeMyAllergens` chỉ gửi khi đã đăng nhập (BE trả 401 nếu không có token).
 */
export function toRecipeQueryParams(filters: RecipeFilters, signedIn: boolean): RecipeQueryParams {
  return {
    tag: filters.tag,
    maxCalories: filters.calorie === 'under300' ? 299 : filters.calorie === '300to500' ? 500 : undefined,
    maxCookTimeMinutes: filters.cookTime ? Number(filters.cookTime) : undefined,
    mealType: filters.mealType ? toApiMealType(filters.mealType) : undefined,
    excludeMyAllergens: signedIn ? true : undefined,
  };
}
