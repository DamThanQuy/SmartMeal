import { healthSyncService } from '@/features/nutrition';
import { todayIso } from '@/utils/date';
import type { HealthConnectSourceId } from '../types/profile.types';
import { toHealthConnectState } from './healthConnect.mapper';
import { healthConnectPreferences } from './healthConnectPreferences';
import type { healthConnectMockService } from './healthConnectService.mock';

/** App chưa tích hợp thư viện đọc Health Connect/HealthKit (cần Expo Dev Client) — không giả vờ đã kết nối. */
export const HEALTH_CONNECT_UNAVAILABLE_MESSAGE =
  'Bản này chưa đọc được Health Connect (cần bản Dev Client có tích hợp Health Connect). SmartMeal không gửi số liệu giả — số liệu vận động hôm nay vẫn lấy từ máy chủ.';

// Bản gọi backend thật (docs/fetch-api/part1 §9). Health Connect/HealthKit thật cần Expo Dev Client
// (docs/structure_system.md §2/§11) mà app chưa tích hợp: không báo "đã kết nối" và không gửi số liệu
// bịa lên server. Nguồn nào bật là tùy chọn cục bộ; số liệu hôm nay lấy từ GET /health-sync/daily-summary.
export const healthConnectApiService: Partial<typeof healthConnectMockService> = {
  async getStatus() {
    const [preferences, activity] = await Promise.all([
      healthConnectPreferences.load(),
      healthSyncService.getDailySummary(todayIso()),
    ]);
    return toHealthConnectState({ ...preferences, connected: false }, activity);
  },

  async toggleSource(sourceId: HealthConnectSourceId) {
    const preferences = await healthConnectPreferences.load();
    const disabledSources = preferences.disabledSources.includes(sourceId)
      ? preferences.disabledSources.filter(id => id !== sourceId)
      : [...preferences.disabledSources, sourceId];
    await healthConnectPreferences.save({ ...preferences, disabledSources });
  },

  async connect() {
    throw new Error(HEALTH_CONNECT_UNAVAILABLE_MESSAGE);
  },

  async disconnect() {
    await healthConnectPreferences.save({
      ...(await healthConnectPreferences.load()),
      connected: false,
    });
  },

  // POST /health-sync/steps-and-calories chỉ gửi khi có nguồn đọc thật — chưa có: báo rõ thay vì gửi
  // số liệu mẫu (số mẫu sẽ bị lưu thật và cộng vào ngân sách calo như số của người dùng).
  async syncNow() {
    throw new Error(HEALTH_CONNECT_UNAVAILABLE_MESSAGE);
  },
};
