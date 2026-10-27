import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isOnlineNow } from '@/services/network/connectivity';
import type { MealType } from '@/types/meal.types';
import { nutritionService } from '../services/nutritionService';
import { buildPendingMealLog, isRetryableSyncError } from '../services/offlineQueue';
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
    // F12 — mỗi lần ghi có Idempotency-Key. Đang mất mạng, hoặc mạng rớt giữa chừng, thì cất vào hàng
    // đợi offline (trả [] — món hiện ở mục "Chờ đồng bộ" của Diary) để gửi lại sau mà không ghi trùng.
    mutationFn: async ({ mealType, entries }: { mealType: MealType; entries: NewMealLogInput[] }) => {
      const pending = buildPendingMealLog(dateIso, mealType, entries);
      const queue = () => {
        useOfflineSyncStore.getState().enqueue(pending);
        return [];
      };
      if (!(await isOnlineNow())) return queue();
      try {
        return await nutritionService.addLogEntries(dateIso, mealType, entries, {
          idempotencyKey: pending.idempotencyKey,
        });
      } catch (error) {
        if (isRetryableSyncError(error)) return queue();
        throw error;
      }
    },
    // Cả khi lỗi: không biết request đã tới BE hay chưa (mất mạng sau khi gửi) nên làm mới để nhật
    // ký luôn phản ánh đúng những gì server đang có.
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

// Backend không có endpoint lấy 1 bản ghi → dùng chung query của cả ngày rồi chọn đúng bản ghi.
export function useMealLogEntry(dateIso: string, entryId: string | undefined) {
  return useQuery({
    queryKey: diaryQueryKey(dateIso),
    queryFn: () => nutritionService.getDiaryDay(dateIso),
    select: diary => (entryId ? findEntryById(diary, entryId) : undefined),
    enabled: Boolean(entryId),
  });
}
