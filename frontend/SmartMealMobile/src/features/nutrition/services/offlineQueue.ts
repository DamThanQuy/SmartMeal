import { format } from 'date-fns';
import { isApiError } from '@/services/api';
import { MEAL_TYPE_TITLES, type MealType } from '@/types/meal.types';
import { createIdempotencyKey, useOfflineSyncStore, type PendingMealLog } from '../state/offlineSyncStore';
import type { NewMealLogInput } from '../types/nutrition.types';
import { nutritionService } from './nutritionService';

// Hàng đợi offline cho việc ghi món (F12, BR-261/262). Mỗi lần ghi có một Idempotency-Key; mất mạng
// (trước hoặc giữa chừng request) thì cất nguyên payload + khóa vào hàng đợi, có mạng lại thì gửi lại
// đúng request đó — máy chủ không ghi trùng dù lần đầu thực ra đã tới nơi.

/** Lỗi do mạng (chưa chắc request tới máy chủ) — đáng gửi lại; lỗi khác là máy chủ đã trả lời. */
export function isRetryableSyncError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return true;
  // Lần gửi trước cùng khóa còn đang xử lý: thử lại sau.
  return error.details.includes('idempotency_in_progress');
}

export function buildPendingMealLog(
  dateIso: string,
  mealType: MealType,
  entries: NewMealLogInput[],
  idempotencyKey: string = createIdempotencyKey(),
  now: Date = new Date(),
): PendingMealLog {
  const names = entries.map(entry => entry.foodName).join(', ');
  return {
    idempotencyKey,
    dateIso,
    mealType,
    entries,
    label: `Thêm ${names} · ${MEAL_TYPE_TITLES[mealType]}`,
    timeLabel: format(now, 'HH:mm'),
  };
}

let flushing: Promise<number> | null = null;

/**
 * Gửi lần lượt các mục đang chờ (bỏ qua mục máy chủ đã từ chối). Dừng ở lỗi mạng đầu tiên. Trả về số
 * mục đã đồng bộ. Gọi chồng nhau thì dùng chung một lượt.
 */
export function flushOfflineQueue(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const store = useOfflineSyncStore.getState();
    let synced = 0;
    for (const item of store.pending.filter(pending => !pending.errorMessage)) {
      try {
        await nutritionService.addLogEntries(item.dateIso, item.mealType, item.entries, {
          idempotencyKey: item.idempotencyKey,
        });
        useOfflineSyncStore.getState().remove(item.idempotencyKey);
        synced += 1;
      } catch (error) {
        if (isRetryableSyncError(error)) break;
        useOfflineSyncStore
          .getState()
          .markFailed(item.idempotencyKey, error instanceof Error ? error.message : 'Không đồng bộ được.');
      }
    }
    return synced;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
