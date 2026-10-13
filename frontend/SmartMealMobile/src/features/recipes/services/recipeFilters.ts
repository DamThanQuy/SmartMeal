import { getCurrentUserAllergyIds } from '@/state/user/userProfileStore';
import type { Recipe, RecipeFilters, RecipeMatch } from '../types/recipe.types';

// Logic lọc dùng chung cho bản mock và bản gọi API của recipeService — không gọi mạng, không đọc mock.

/** BR-101/102 — loại bỏ công thức chứa dị ứng đã khai báo, dùng chung cho Discovery + Fridge + Planner. */
export function filterOutUserAllergens(recipes: Recipe[]): {
  allowed: Recipe[];
  excludedAllergenIds: string[];
} {
  const currentUserAllergyIds = getCurrentUserAllergyIds();
  const excludedAllergenIds = new Set<string>();
  const allowed = recipes.filter(recipe => {
    const matched = recipe.allergenIds.filter(id => currentUserAllergyIds.includes(id));
    matched.forEach(id => excludedAllergenIds.add(id));
    return matched.length === 0;
  });
  return { allowed, excludedAllergenIds: Array.from(excludedAllergenIds) };
}

/** Khoảng calo theo chip lọc (BE chỉ có `maxCalories` nên cận dưới luôn lọc ở đây). */
export function matchesCalorieFilter(recipe: Recipe, calorie: RecipeFilters['calorie']): boolean {
  const calories = recipe.nutritionPerServing.calories;
  if (calorie === 'under300') return calories < 300;
  if (calorie === '300to500') return calories >= 300 && calories <= 500;
  if (calorie === 'over500') return calories > 500;
  return true;
}

export function applyFilters(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  return recipes.filter(recipe => {
    if (filters.tag && !recipe.tags.includes(filters.tag)) return false;
    if (filters.cookTime && recipe.durationMinutes > Number(filters.cookTime)) return false;
    if (filters.mealType && recipe.mealTypes.length > 0 && !recipe.mealTypes.includes(filters.mealType)) {
      return false;
    }
    return matchesCalorieFilter(recipe, filters.calorie);
  });
}

/** So khớp tên nguyên liệu không phân biệt hoa/thường và dấu tiếng Việt ("ca chua" khớp "Cà chua"). */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function matchIngredientCount(recipe: Recipe, availableIngredientNames: string[]): number {
  const available = availableIngredientNames.map(foldText).filter(Boolean);
  return recipe.ingredients.filter(ingredient => {
    const name = foldText(ingredient.name);
    return available.some(item => name.includes(item) || item.includes(name));
  }).length;
}

/** Fridge Scanner: xếp công thức theo tỉ lệ nguyên liệu đang có (BR-080). */
export function rankByPantry(recipes: Recipe[], availableIngredientNames: string[]): RecipeMatch[] {
  return recipes
    .map(recipe => ({
      recipe,
      matchedCount: matchIngredientCount(recipe, availableIngredientNames),
      totalIngredients: recipe.ingredients.length,
    }))
    .filter(match => match.matchedCount > 0)
    .sort((a, b) => b.matchedCount / b.totalIngredients - a.matchedCount / a.totalIngredients);
}
