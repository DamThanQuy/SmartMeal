import { useQuery } from '@tanstack/react-query';
import { recipeService } from '../services/recipeService';
import type { RecipeFilters } from '../types/recipe.types';

export function useRecommendedRecipes(filters: RecipeFilters) {
  return useQuery({
    queryKey: ['recipes', 'recommended', filters],
    queryFn: () => recipeService.getRecommended(filters),
  });
}

export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', 'detail', recipeId],
    queryFn: () => recipeService.getRecipeById(recipeId),
  });
}

export function useFridgeRecipes(availableIngredientNames: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['recipes', 'fridge', availableIngredientNames],
    queryFn: () => recipeService.getRecipesForIngredients(availableIngredientNames),
    enabled,
  });
}
