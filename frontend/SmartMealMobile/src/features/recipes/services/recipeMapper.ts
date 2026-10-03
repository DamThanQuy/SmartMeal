import { ALLERGY_OPTIONS } from '@/features/health';
import type { NutritionInfo } from '@/features/nutrition';
import type { Recipe, RecipeTag } from '../types/recipe.types';
import type { RecipeApiDto } from '../types/recipe.api.types';

const API_ALLERGY_IDS: Record<number, string> = {
  1: 'seafood',
  2: 'peanut',
  3: 'dairy',
  4: 'egg',
  5: 'gluten',
  6: 'soy',
  7: 'treeNut',
  8: 'sesame',
};

const API_TAGS: Record<string, RecipeTag> = {
  'Eat Clean': 'eatClean',
  Keto: 'keto',
  'Thuần Chay (Vegan)': 'vegan',
  'Nhanh Gọn (< 15 phút)': 'quick',
};

export type FoodAllergyIndex = ReadonlyMap<string, string | undefined>;

function mapTag(tag: string): RecipeTag | undefined {
  return API_TAGS[tag] ?? API_TAGS[Object.keys(API_TAGS).find(key => key.toLowerCase() === tag.toLowerCase()) ?? ''];
}

function formatAmount(amount: number, unit: string): string {
  const normalizedAmount = Number.isInteger(amount) ? String(amount) : String(amount).replace(/\.0+$/, '');
  return `${normalizedAmount} ${unit}`;
}

function mapInstructions(instructions: string) {
  return instructions
    .split(/\r?\n/)
    .map(instruction => instruction.trim())
    .filter(Boolean)
    .map((instruction, index) => ({
      order: index + 1,
      instruction: instruction.replace(/^\d+[.)]\s*/, ''),
    }));
}

function mapNutrition(dto: RecipeApiDto): NutritionInfo {
  return {
    calories: Math.round(dto.caloriesPerServing),
    proteinG: Math.round(dto.proteinPerServing),
    carbsG: Math.round(dto.carbsPerServing),
    fatG: Math.round(dto.fatPerServing),
  };
}

export function allergySlugFromApiId(allergyId: number | null | undefined): string | undefined {
  const slug = allergyId == null ? undefined : API_ALLERGY_IDS[allergyId];
  return slug && ALLERGY_OPTIONS.some(option => option.id === slug) ? slug : undefined;
}

export function mapRecipeDto(dto: RecipeApiDto, allergyIndex: FoodAllergyIndex): Recipe {
  const ingredients = dto.ingredients.map(ingredient => ({
    name: ingredient.name,
    amount: formatAmount(ingredient.amount, ingredient.unit),
    allergenId: allergyIndex.get(ingredient.ingredientId),
  }));
  const allergenIds = Array.from(
    new Set(ingredients.flatMap(ingredient => (ingredient.allergenId ? [ingredient.allergenId] : []))),
  );

  return {
    id: dto.id,
    name: dto.title,
    durationMinutes: dto.prepTimeMinutes + dto.cookTimeMinutes,
    rating: 0,
    servings: dto.servings,
    nutritionPerServing: mapNutrition(dto),
    tags: dto.tags.flatMap(tag => {
      const mapped = mapTag(tag);
      return mapped ? [mapped] : [];
    }),
    ingredients,
    steps: mapInstructions(dto.instructions),
    allergenIds,
  };
}

export async function mapApiRecipes(dtos: RecipeApiDto[], allergyIndex: FoodAllergyIndex): Promise<Recipe[]> {
  return dtos.map(dto => mapRecipeDto(dto, allergyIndex));
}
