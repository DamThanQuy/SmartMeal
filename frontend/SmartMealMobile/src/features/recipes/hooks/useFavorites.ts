import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recipeService } from '../services/recipeService';

export const favoriteRecipesQueryKey = ['recipes', 'favorites'] as const;
export const collectionsQueryKey = ['recipes', 'collections'] as const;

export function useFavoriteRecipes(enabled = true) {
  return useQuery({
    queryKey: favoriteRecipesQueryKey,
    queryFn: recipeService.getFavoriteRecipes,
    enabled,
  });
}

export function useIsFavorite(recipeId: string, enabled = true) {
  const query = useFavoriteRecipes(enabled);
  return {
    ...query,
    isFavorite: query.data?.some(recipe => recipe.id === recipeId) ?? false,
  };
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recipeService.toggleFavorite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: favoriteRecipesQueryKey });
    },
  });
}

export function useCollections(enabled = true) {
  return useQuery({
    queryKey: collectionsQueryKey,
    queryFn: recipeService.getCollections,
    enabled,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recipeService.createCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey });
    },
  });
}