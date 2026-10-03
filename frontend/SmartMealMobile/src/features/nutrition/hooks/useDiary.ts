import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isOfflineDevOverrideActive } from '@/state/app/appStore';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { MEAL_TYPE_TITLES, type MealType } from '@/types/meal.types';
import { nutritionService } from '../services/nutritionService';
import { useOfflineSyncStore } from '../state/offlineSyncStore';
import type { NewMealLogInput } from '../types/nutrition.types';
import { findEntryById } from '../utils/diary';

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
    // Tiến độ tuần và Dashboard tổng hợp lại từ nutritionService.getDiaryDay()/nhật ký nên phải
    // invalidate theo — tránh hiện số liệu cũ sau khi ghi/sửa/xóa từ Diary hoặc luồng AI/
    // FoodSearch (kể cả khi ghi cho ngày khác hôm nay — nên theo tiền tố, không theo từng ngày).
    void queryClient.invalidateQueries({ queryKey: ['progress'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
            timeLabel: format(new Date(entry.loggedAt ?? Date.now()), 'HH:mm'),
          });
        });
      }
    },
    // Cả khi chỉ lưu được một phần (PartialLogError): món đã lưu vẫn phải hiện ra trong nhật ký.
    onSettled: invalidate,
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
    // Cả khi UpdateIncompleteError (đã ghi bản mới nhưng chưa xóa được bản cũ): nhật ký đã đổi.
    onSettled: invalidate,
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

// Backend không có endpoint lấy 1 bản ghi → dùng chung query của cả ngày rồi chọn đúng bản ghi.
export function useMealLogEntry(dateIso: string, entryId: string | undefined) {
  return useQuery({
    queryKey: diaryQueryKey(dateIso),
    queryFn: () => nutritionService.getDiaryDay(dateIso),
    select: diary => (entryId ? findEntryById(diary, entryId) : undefined),
    enabled: Boolean(entryId),
  });
}
