import { create } from 'zustand';
import { STORAGE_KEYS } from '@/constants/storage';
import { storageService } from '@/services/storage/storage';
import { getCurrentUserId } from '@/state/auth/authStore';
import { registerUserDataReset } from '@/state/resetUserData';
import type { MealType } from '@/types/meal.types';
import type { NewMealLogInput } from '../types/nutrition.types';

/**
 * Một lần ghi món chưa tới được máy chủ. Giữ nguyên payload và `idempotencyKey` để gửi lại đúng request
 * cũ: máy chủ nhận cùng khóa + cùng nội dung thì trả lại kết quả lần đầu, không ghi trùng (F12).
 */
export interface PendingMealLog {
  /** Cũng là header Idempotency-Key. */
  idempotencyKey: string;
  dateIso: string;
  mealType: MealType;
  entries: NewMealLogInput[];
  /** "Thêm Phở bò · Bữa trưa". */
  label: string;
  /** Giờ người dùng ghi, "HH:mm". */
  timeLabel: string;
  /** Máy chủ từ chối (lỗi nghiệp vụ, không phải mất mạng) — không tự gửi lại, người dùng bỏ đi. */
  errorMessage?: string;
}

interface OfflineSyncState {
  pending: PendingMealLog[];
  enqueue: (item: PendingMealLog) => void;
  remove: (idempotencyKey: string) => void;
  markFailed: (idempotencyKey: string, errorMessage: string) => void;
  /** Nạp hàng đợi đã lưu của tài khoản hiện tại (gọi khi vào Main). */
  hydrate: () => Promise<void>;
  /** Chỉ xoá trong bộ nhớ (đăng xuất) — hàng đợi đã lưu chờ tài khoản đó đăng nhập lại. */
  clearMemory: () => void;
  /** Xoá hẳn, kể cả bản đã lưu (xoá dữ liệu cá nhân). */
  discardAll: () => Promise<void>;
}

function keyFor(): string {
  return `${STORAGE_KEYS.OFFLINE_QUEUE_PREFIX}${getCurrentUserId() ?? 'guest'}`;
}

function isPendingMealLog(value: unknown): value is PendingMealLog {
  const item = value as Partial<PendingMealLog> | null;
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.idempotencyKey === 'string' &&
    typeof item.dateIso === 'string' &&
    typeof item.mealType === 'string' &&
    Array.isArray(item.entries) &&
    typeof item.label === 'string'
  );
}

export function parsePendingQueue(raw: string | undefined): PendingMealLog[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPendingMealLog) : [];
  } catch {
    return [];
  }
}

function persist(pending: PendingMealLog[]): void {
  void storageService.setString(keyFor(), JSON.stringify(pending)).catch(() => {});
}

// design/StateOffline.dc.html (BR-261/262).
export const useOfflineSyncStore = create<OfflineSyncState>()((set, get) => ({
  pending: [],
  enqueue: item => {
    const pending = [...get().pending.filter(p => p.idempotencyKey !== item.idempotencyKey), item];
    set({ pending });
    persist(pending);
  },
  remove: idempotencyKey => {
    const pending = get().pending.filter(item => item.idempotencyKey !== idempotencyKey);
    set({ pending });
    persist(pending);
  },
  markFailed: (idempotencyKey, errorMessage) => {
    const pending = get().pending.map(item =>
      item.idempotencyKey === idempotencyKey ? { ...item, errorMessage } : item,
    );
    set({ pending });
    persist(pending);
  },
  hydrate: async () => {
    try {
      set({ pending: parsePendingQueue(await storageService.getString(keyFor())) });
    } catch {
      set({ pending: [] });
    }
  },
  clearMemory: () => set({ pending: [] }),
  discardAll: async () => {
    set({ pending: [] });
    await storageService.delete(keyFor()).catch(() => {});
  },
}));

registerUserDataReset('offlineSync', () => useOfflineSyncStore.getState().clearMemory());

/** Khóa idempotency ngẫu nhiên (khớp ^[A-Za-z0-9._:-]{1,100}$ phía máy chủ). */
export function createIdempotencyKey(): string {
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
