import { STORAGE_KEYS } from '@/constants/storage';
import { storageService } from '@/services/storage/storage';
import { EMPTY_PROFILE_EXTRAS, type HealthProfileExtras } from '../types/health.types';

export { EMPTY_PROFILE_EXTRAS };

// Phần hồ sơ backend không lưu — chỉ còn các lựa chọn "Khác" (dị ứng/bệnh lý không có mục tương
// ứng trên BE) — giữ ở AsyncStorage theo từng user; không nhạy cảm nên không cần SecureStore. Mất
// dữ liệu này (xóa app, đổi máy) chỉ làm người dùng chọn lại, không ảnh hưởng chỉ số do BE tính.

function keyFor(userId: string): string {
  return `${STORAGE_KEYS.PROFILE_EXTRAS_PREFIX}${userId}`;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Đọc JSON đã lưu; dữ liệu hỏng/thiếu field → coi như rỗng (không crash khi nạp hồ sơ). */
export function parseProfileExtras(raw: string | undefined): HealthProfileExtras {
  if (!raw) return EMPTY_PROFILE_EXTRAS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_PROFILE_EXTRAS;
    const record = parsed as Record<string, unknown>;
    return {
      localAllergyIds: toStringArray(record.localAllergyIds),
      localHealthConditionIds: toStringArray(record.localHealthConditionIds),
    };
  } catch {
    return EMPTY_PROFILE_EXTRAS;
  }
}

export const profileExtrasStorage = {
  async load(userId: string): Promise<HealthProfileExtras> {
    try {
      return parseProfileExtras(await storageService.getString(keyFor(userId)));
    } catch {
      return EMPTY_PROFILE_EXTRAS;
    }
  },

  /** Ghi thất bại không làm hỏng thao tác chính (BE đã lưu xong) — chỉ cảnh báo ở dev. */
  async save(userId: string, extras: HealthProfileExtras): Promise<void> {
    try {
      await storageService.setString(keyFor(userId), JSON.stringify(extras));
    } catch (error) {
      if (__DEV__) console.warn('[profileExtras] không lưu được phần hồ sơ cục bộ:', error);
    }
  },

  async clear(userId: string): Promise<void> {
    try {
      await storageService.delete(keyFor(userId));
    } catch {
      // Không có gì để dọn nếu storage không truy cập được.
    }
  },
};
