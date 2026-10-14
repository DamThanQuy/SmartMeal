import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { recipeService } from '../services/recipeService';
import type { CollectionUpdate, NewCollectionInput, Recipe } from '../types/recipe.types';

export const favoriteRecipesQueryKey = ['recipes', 'favorites'] as const;
export const collectionsQueryKey = ['recipes', 'collections'] as const;
export const collectionQueryKey = (collectionId: string) => ['recipes', 'collection', collectionId] as const;

export function useFavoriteRecipes(enabled = true) {
  return useQuery({
    queryKey: favoriteRecipesQueryKey,
    queryFn: () => recipeService.getFavoriteRecipes(),
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

/** Bấm tim: bỏ khỏi danh sách yêu thích ngay khi server xác nhận, thêm thì tải lại danh sách (cần đủ thông tin món). */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => recipeService.toggleFavorite(recipeId),
    onSuccess: (result, recipeId) => {
      if (!result.isFavorite) {
        queryClient.setQueryData<Recipe[]>(favoriteRecipesQueryKey, current =>
          current?.filter(recipe => recipe.id !== recipeId),
        );
      }
      void queryClient.invalidateQueries({ queryKey: favoriteRecipesQueryKey });
    },
  });
}

function invalidateCollections(queryClient: QueryClient, collectionId?: string) {
  void queryClient.invalidateQueries({ queryKey: collectionsQueryKey });
  if (collectionId) {
    void queryClient.invalidateQueries({ queryKey: collectionQueryKey(collectionId) });
  }
}

export function useCollections(enabled = true) {
  return useQuery({
    queryKey: collectionsQueryKey,
    queryFn: () => recipeService.getCollections(),
    enabled,
  });
}

export function useCollection(collectionId: string) {
  return useQuery({
    queryKey: collectionQueryKey(collectionId),
    queryFn: () => recipeService.getCollection(collectionId),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCollectionInput) => recipeService.createCollection(input),
    onSuccess: collection => invalidateCollections(queryClient, collection.id),
  });
}

export function useUpdateCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: CollectionUpdate) => recipeService.updateCollection(collectionId, update),
    onSuccess: collection => {
      queryClient.setQueryData(collectionQueryKey(collectionId), collection);
      invalidateCollections(queryClient);
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) => recipeService.deleteCollection(collectionId),
    onSuccess: (_result, collectionId) => {
      queryClient.removeQueries({ queryKey: collectionQueryKey(collectionId) });
      invalidateCollections(queryClient);
    },
  });
}

export function useAddRecipeToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      recipeService.addRecipeToCollection(collectionId, recipeId),
    onSuccess: (_result, { collectionId }) => invalidateCollections(queryClient, collectionId),
  });
}

/** Bật liên kết chia sẻ (đã bật thì lấy lại mã cũ) — chủ sở hữu. */
export function useCreateCollectionShareLink(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recipeService.createCollectionShareLink(collectionId),
    onSuccess: () => invalidateCollections(queryClient, collectionId),
  });
}

/** Tắt liên kết chia sẻ — người đang giữ liên kết không mở được nữa. */
export function useRevokeCollectionShareLink(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recipeService.revokeCollectionShareLink(collectionId),
    onSuccess: () => invalidateCollections(queryClient, collectionId),
  });
}

/** Bộ sưu tập mở từ liên kết chia sẻ (chỉ đọc); undefined khi liên kết sai hoặc đã tắt. */
export function useSharedCollection(shareToken: string) {
  return useQuery({
    queryKey: ['recipes', 'shared-collection', shareToken],
    queryFn: () => recipeService.getSharedCollection(shareToken),
  });
}

export function useRemoveRecipeFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      recipeService.removeRecipeFromCollection(collectionId, recipeId),
    onSuccess: (_result, { collectionId }) => invalidateCollections(queryClient, collectionId),
  });
}
