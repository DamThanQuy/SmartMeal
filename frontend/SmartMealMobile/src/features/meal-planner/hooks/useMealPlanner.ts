import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlanChangeStore } from '@/state/planner/planChangeStore';
import type { MealType } from '@/types/meal.types';
import { mealPlannerService } from '../services/mealPlannerService';

export const weekPlanQueryKey = (weekStartIso: string) => ['meal-plan', weekStartIso] as const;

export function useWeekPlan(weekStartIso: string) {
  return useQuery({
    queryKey: weekPlanQueryKey(weekStartIso),
    queryFn: () => mealPlannerService.getWeekPlan(weekStartIso),
  });
}

function useInvalidateWeekPlan(weekStartIso: string) {
  const queryClient = useQueryClient();
  const markPlanChanged = usePlanChangeStore(state => state.markPlanChanged);
  return () => {
    void queryClient.invalidateQueries({ queryKey: weekPlanQueryKey(weekStartIso) });
    // Danh sách đi chợ sinh từ thực đơn (BR-170/171) và BE không tự cập nhật → đánh dấu để Grocery
    // nhắc "Thực đơn đã đổi — Tạo lại danh sách".
    markPlanChanged(weekStartIso);
    void queryClient.invalidateQueries({ queryKey: ['grocery', weekStartIso] });
  };
}

export function useSetMealSlot(weekStartIso: string) {
  const invalidate = useInvalidateWeekPlan(weekStartIso);
  return useMutation({
    mutationFn: ({ dateIso, mealType, recipeId }: { dateIso: string; mealType: MealType; recipeId: string }) =>
      mealPlannerService.setSlot(weekStartIso, dateIso, mealType, recipeId),
    onSuccess: invalidate,
  });
}

export function useClearMealSlot(weekStartIso: string) {
  const invalidate = useInvalidateWeekPlan(weekStartIso);
  return useMutation({
    mutationFn: (mealPlanId: string) => mealPlannerService.clearSlot(mealPlanId),
    onSuccess: invalidate,
  });
}

/** "Đã nấu" không đổi nguyên liệu nên không làm cũ danh sách đi chợ. */
export function useSetMealCompleted(weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mealPlanId, isCompleted }: { mealPlanId: string; isCompleted: boolean }) =>
      mealPlannerService.setCompleted(mealPlanId, isCompleted),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: weekPlanQueryKey(weekStartIso) }),
  });
}

export function useAutoFillWeek(weekStartIso: string) {
  const invalidate = useInvalidateWeekPlan(weekStartIso);
  return useMutation({
    mutationFn: (targetDailyCalories?: number) => mealPlannerService.autoFillWeek(weekStartIso, targetDailyCalories),
    onSuccess: invalidate,
  });
}

export function useRegenerateWeek(weekStartIso: string) {
  const invalidate = useInvalidateWeekPlan(weekStartIso);
  return useMutation({
    mutationFn: (targetDailyCalories?: number) => mealPlannerService.regenerateWeek(weekStartIso, targetDailyCalories),
    onSuccess: invalidate,
  });
}

export function useSlotSuggestions(enabled: boolean, mealType?: MealType) {
  return useQuery({
    queryKey: ['meal-plan', 'slot-suggestions', mealType ?? 'all'],
    queryFn: () => mealPlannerService.getSlotSuggestions(mealType),
    enabled,
  });
}
