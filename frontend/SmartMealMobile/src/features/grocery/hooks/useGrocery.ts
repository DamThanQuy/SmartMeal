import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftWeek } from '@/features/meal-planner';
import { groceryService, type ManualGroceryItemInput } from '../services/groceryService';

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

export function useAddManualGroceryItem(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualGroceryItemInput) => groceryService.addManualItem(weekStartIso, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryQueryKey(weekStartIso) });
    },
  });
}

// GroceryDone "Giữ lại N món chưa mua" (BR-171) — chỉ ảnh hưởng danh sách tuần SAU, không đổi
// tuần hiện tại.
export function useCarryOverPendingItems(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groceryService.carryOverPendingItems(weekStartIso),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groceryQueryKey(shiftWeek(weekStartIso, 1)) });
    },
  });
}
