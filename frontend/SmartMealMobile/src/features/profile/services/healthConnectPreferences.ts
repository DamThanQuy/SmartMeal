import { STORAGE_KEYS } from '@/constants/storage';
import { storageService } from '@/services/storage/storage';
import { getCurrentUserId } from '@/state/auth/authStore';
import type { HealthConnectSourceId } from '../types/profile.types';

// Tùy chọn Health Connect chỉ ở máy (docs/fetch-api/part1 §9): "đã kết nối" và nguồn nào được
// đọc không có ở backend. Không nhạy cảm nên dùng AsyncStorage, theo từng user.

export interface HealthConnectPreferences {
  connected: boolean;
  disabledSources: HealthConnectSourceId[];
}

export const DEFAULT_HEALTH_CONNECT_PREFERENCES: HealthConnectPreferences = {
  connected: true,
  disabledSources: [],
};

const SOURCE_IDS: readonly HealthConnectSourceId[] = ['steps', 'distance', 'activeCalories'];

function keyFor(): string {
  return `${STORAGE_KEYS.HEALTH_CONNECT_PREFIX}${getCurrentUserId() ?? 'guest'}`;
}

/** Dữ liệu hỏng/thiếu field → dùng mặc định (đã kết nối, bật mọi nguồn), không ném lỗi. */
export function parseHealthConnectPreferences(raw: string | undefined): HealthConnectPreferences {
  if (!raw) return DEFAULT_HEALTH_CONNECT_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_HEALTH_CONNECT_PREFERENCES;
    const record = parsed as Record<string, unknown>;
    const disabled = Array.isArray(record.disabledSources) ? record.disabledSources : [];
    return {
      connected:
        typeof record.connected === 'boolean'
          ? record.connected
          : DEFAULT_HEALTH_CONNECT_PREFERENCES.connected,
      disabledSources: SOURCE_IDS.filter(id => disabled.includes(id)),
    };
  } catch {
    return DEFAULT_HEALTH_CONNECT_PREFERENCES;
  }
}

export const healthConnectPreferences = {
  async load(): Promise<HealthConnectPreferences> {
    try {
      return parseHealthConnectPreferences(await storageService.getString(keyFor()));
    } catch {
      return DEFAULT_HEALTH_CONNECT_PREFERENCES;
    }
  },

  async save(preferences: HealthConnectPreferences): Promise<void> {
    await storageService.setString(keyFor(), JSON.stringify(preferences));
  },
};
