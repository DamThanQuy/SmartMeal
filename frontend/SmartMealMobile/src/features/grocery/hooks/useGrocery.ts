import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { shiftWeek } from '@/features/meal-planner';
import { groceryService, type ManualGroceryItemInput } from '../services/groceryService';
import type { CompleteShoppingInput, GroceryItemStatus } from '../types/grocery.types';

export const groceryQueryKey = (weekStartIso: string) => ['grocery', weekStartIso] as const;

function invalidateGrocery(queryClient: QueryClient, weekStartIso: string) {
  void queryClient.invalidateQueries({ queryKey: groceryQueryKey(weekStartIso) });
}

export function useGroceryList(weekStartIso: string) {
  return useQuery({
    queryKey: groceryQueryKey(weekStartIso),
    queryFn: () => groceryService.getGroceryList(weekStartIso),
  });
}

export function useRegenerateGroceryList(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groceryService.regenerateFromPlan(weekStartIso),
    onSuccess: list => queryClient.setQueryData(groceryQueryKey(weekStartIso), list),
  });
}

/** BR-173 — gửi trạng thái đích của món đang hiển thị (không toggle mù). */
export function useToggleGroceryItem(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, nextStatus }: { itemId: string; nextStatus: GroceryItemStatus }) =>
      groceryService.toggleItemStatus(weekStartIso, itemId, nextStatus),
    onSuccess: () => invalidateGrocery(queryClient, weekStartIso),
  });
}

export function useMarkAllGroceryPurchased(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groceryService.markAllPurchased(weekStartIso),
    onSuccess: () => invalidateGrocery(queryClient, weekStartIso),
  });
}

export function useAddManualGroceryItem(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualGroceryItemInput) => groceryService.addManualItem(weekStartIso, input),
    onSuccess: () => invalidateGrocery(queryClient, weekStartIso),
  });
}

export function useDeleteGroceryItem(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => groceryService.deleteItem(itemId),
    onSuccess: () => invalidateGrocery(queryClient, weekStartIso),
  });
}

/** Bỏ các món đã mua khỏi danh sách (DELETE /grocery/clear-checked). */
export function useClearPurchasedGrocery(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groceryService.clearPurchased(weekStartIso),
    onSuccess: () => invalidateGrocery(queryClient, weekStartIso),
  });
}

// GroceryDone "Hoàn tất mua sắm" — danh sách chuyển sang tuần sau (món chưa mua được giữ lại nếu chọn).
export function useCompleteShopping(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteShoppingInput) => groceryService.completeShopping(weekStartIso, input),
    onSuccess: result => {
      invalidateGrocery(queryClient, weekStartIso);
      queryClient.setQueryData(groceryQueryKey(shiftWeek(weekStartIso, 1)), result.list);
    },
  });
}
