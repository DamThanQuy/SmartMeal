import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groceryService } from '../services/groceryService';

export const groceryQueryKey = (weekStartIso: string) => ['grocery', weekStartIso] as const;

export function useGroceryList(weekStartIso: string) {
  return useQuery({
    queryKey: groceryQueryKey(weekStartIso),
    queryFn: () => groceryService.getGroceryList(weekStartIso),
  });
}

export function useToggleGroceryItem(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => groceryService.toggleItemStatus(weekStartIso, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryQueryKey(weekStartIso) });
    },
  });
}

export function useMarkAllGroceryPurchased(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groceryService.markAllPurchased(weekStartIso),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryQueryKey(weekStartIso) });
    },
  });
}
