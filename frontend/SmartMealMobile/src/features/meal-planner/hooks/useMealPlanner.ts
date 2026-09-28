import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  return () => {
    void queryClient.invalidateQueries({ queryKey: weekPlanQueryKey(weekStartIso) });
    // Grocery được sinh từ Meal Plan (BR-170/171) nên phải tính lại khi thực đơn đổi.
    void queryClient.invalidateQueries({ queryKey: ['grocery', weekStartIso] });
  };
}

export function useSetMealSlot(weekStartIso: string) {
  const invalidate = useInvalidateWeekPlan(weekStartIso);
  return useMutation({
    mutationFn: ({
      dateIso,
      mealType,
      recipeId,
    }: {
      dateIso: string;
      mealType: MealType;
      recipeId: string;
    }) => mealPlannerService.setSlot(weekStartIso, dateIso, mealType, recipeId),
    onSuccess: invalidate,
  });
}

export function useAutoFillWeek(weekStartIso: string) {
  const invalidate = useInvalidateWeekPlan(weekStartIso);
  return useMutation({
    mutationFn: () => mealPlannerService.autoFillWeek(weekStartIso),
    onSuccess: invalidate,
  });
}

export function useSlotSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ['meal-plan', 'slot-suggestions'],
    queryFn: () => mealPlannerService.getSlotSuggestions(),
    enabled,
  });
}
