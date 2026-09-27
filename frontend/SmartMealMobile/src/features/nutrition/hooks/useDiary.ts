import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealType } from '@/types/meal.types';
import { nutritionService, type NewMealLogInput } from '../services/nutritionService';

export const diaryQueryKey = (dateIso: string) => ['diary', dateIso] as const;

export function useDiaryDay(dateIso: string) {
  return useQuery({
    queryKey: diaryQueryKey(dateIso),
    queryFn: () => nutritionService.getDiaryDay(dateIso),
  });
}

function useInvalidateDiary(dateIso: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: diaryQueryKey(dateIso) });
    void queryClient.invalidateQueries({ queryKey: ['progress', dateIso] });
    // Dashboard tổng hợp lại từ nutritionService.getDiaryDay() nên phải invalidate theo —
    // tránh Dashboard hiện số liệu cũ sau khi ghi/sửa/xóa từ Diary hoặc luồng AI/FoodSearch.
    void queryClient.invalidateQueries({ queryKey: ['dashboard', dateIso] });
  };
}

export function useAddMealLogEntries(dateIso: string) {
  const invalidate = useInvalidateDiary(dateIso);
  return useMutation({
    mutationFn: ({ mealType, entries }: { mealType: MealType; entries: NewMealLogInput[] }) =>
      nutritionService.addLogEntries(dateIso, mealType, entries),
    onSuccess: invalidate,
  });
}

export function useUpdateMealLogEntry(dateIso: string) {
  const invalidate = useInvalidateDiary(dateIso);
  return useMutation({
    mutationFn: ({
      entryId,
      patch,
    }: {
      entryId: string;
      patch: { grams?: number; mealType?: MealType };
    }) => nutritionService.updateLogEntry(dateIso, entryId, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteMealLogEntry(dateIso: string) {
  const invalidate = useInvalidateDiary(dateIso);
  return useMutation({
    mutationFn: (entryId: string) => nutritionService.deleteLogEntry(dateIso, entryId),
    onSuccess: invalidate,
  });
}

export function useMealLogEntry(dateIso: string, entryId: string | undefined) {
  return useQuery({
    queryKey: ['diary', dateIso, 'entry', entryId],
    queryFn: () => nutritionService.getLogEntry(dateIso, entryId as string),
    enabled: Boolean(entryId),
  });
}
