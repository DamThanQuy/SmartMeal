import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isOfflineDevOverrideActive } from '@/state/app/appStore';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { MEAL_TYPE_TITLES, type MealType } from '@/types/meal.types';
import { nutritionService, type NewMealLogInput } from '../services/nutritionService';
import { useOfflineSyncStore } from '../state/offlineSyncStore';

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
    onSuccess: (created, variables) => {
      // BR-261/262 — mock luôn áp dụng ngay (không có network layer thật); khi đang mô phỏng
      // offline (màn Dev), chỉ thêm badge "Chờ đồng bộ" vào hàng đợi, không đổi hành vi lưu.
      if (isOfflineDevOverrideActive()) {
        const mealTitle = MEAL_TYPE_TITLES[variables.mealType];
        created.forEach(entry => {
          useOfflineSyncStore.getState().enqueue({
            id: entry.id,
            label: `Thêm ${entry.foodName} · ${mealTitle}`,
            timeLabel: format(new Date(entry.loggedAt), 'HH:mm'),
          });
        });
      }
      invalidate();
    },
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

// BR-040→042 — đổi công tắc "Cộng calo vận động" (CalorieBudgetScreen) phải làm mới ngay số
// hiển thị ở Dashboard/Diary/ProgressChart (cả 3 đều đọc activityCalories qua
// nutritionService.buildSummary → calculateCalorieBudget).
export function useSetIncludeActivityCalories() {
  const queryClient = useQueryClient();
  const setIncludeActivityCalories = useUserProfileStore(state => state.setIncludeActivityCalories);
  return (value: boolean) => {
    setIncludeActivityCalories(value);
    void queryClient.invalidateQueries({ queryKey: ['diary'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['progress'] });
  };
}

export function useMealLogEntry(dateIso: string, entryId: string | undefined) {
  return useQuery({
    queryKey: ['diary', dateIso, 'entry', entryId],
    queryFn: () => nutritionService.getLogEntry(dateIso, entryId as string),
    enabled: Boolean(entryId),
  });
}
