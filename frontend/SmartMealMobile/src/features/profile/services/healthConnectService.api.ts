import { healthSyncService } from '@/features/nutrition';
import { todayIso } from '@/utils/date';
import type { HealthConnectSourceId } from '../types/profile.types';
import { toHealthConnectState } from './healthConnect.mapper';
import { healthConnectPreferences } from './healthConnectPreferences';
import type { healthConnectMockService } from './healthConnectService.mock';

// Số liệu mẫu cho nút "Đồng bộ ngay" ở DEV — khớp design/HealthConnect.dc.html.
const DEV_SAMPLE_METRICS = {
  steps: 6240,
  burnedCalories: 180,
  distanceMeters: 4300,
  source: 'DevSample',
} as const;

// Bản gọi backend thật (docs/fetch-api/part1 §9). Health Connect/HealthKit thật cần Expo Dev Client
// (docs/structure_system.md §2/§11): ở đây "đã kết nối"/nguồn nào bật là tùy chọn cục bộ, còn số
// liệu hôm nay lấy từ GET /health-sync/daily-summary.
export const healthConnectApiService: Partial<typeof healthConnectMockService> = {
  async getStatus() {
    const [preferences, activity] = await Promise.all([
      healthConnectPreferences.load(),
      healthSyncService.getDailySummary(todayIso()),
    ]);
    return toHealthConnectState(preferences, activity);
  },

  async toggleSource(sourceId: HealthConnectSourceId) {
    const preferences = await healthConnectPreferences.load();
    const disabledSources = preferences.disabledSources.includes(sourceId)
      ? preferences.disabledSources.filter(id => id !== sourceId)
      : [...preferences.disabledSources, sourceId];
    await healthConnectPreferences.save({ ...preferences, disabledSources });
  },

  async connect() {
    await healthConnectPreferences.save({
      ...(await healthConnectPreferences.load()),
      connected: true,
    });
  },

  async disconnect() {
    await healthConnectPreferences.save({
      ...(await healthConnectPreferences.load()),
      connected: false,
    });
  },

  // POST /health-sync/steps-and-calories chỉ gửi được khi có nguồn đọc thật — chưa có ở Expo Go.
  // Ở DEV tạo số liệu mẫu để thử luồng Dashboard/CalorieBudget với BE thật; ngoài DEV báo rõ thay
  // vì im lặng không làm gì.
  async syncNow() {
    if (!__DEV__) {
      throw new Error('Đồng bộ Health Connect cần bản Dev Client — chưa hỗ trợ trên bản này.');
    }

    const dateIso = todayIso();
    const summary = await healthSyncService.getDailySummary(dateIso);
    // BE cộng dồn MỌI lần gọi trong ngày (P1-BE-09) nên gửi lặp sẽ nhân đôi số bước → chỉ tạo số
    // liệu mẫu khi hôm nay chưa có gì.
    if (summary.hasSyncedData) return;
    await healthSyncService.syncMetrics({ dateIso, ...DEV_SAMPLE_METRICS });
  },
};
