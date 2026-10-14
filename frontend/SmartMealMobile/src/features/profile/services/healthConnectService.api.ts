import { healthSyncService } from '@/features/nutrition';
import { todayIso } from '@/utils/date';
import type { HealthConnectSourceId } from '../types/profile.types';
import { toHealthConnectState } from './healthConnect.mapper';
import { healthConnectPreferences } from './healthConnectPreferences';
import type { healthConnectMockService } from './healthConnectService.mock';

// Số liệu mẫu cho nút "Đồng bộ ngay" ở DEV — khớp design/HealthConnect.dc.html. Nguồn "Manual" (nhập
// tay, ưu tiên thấp nhất) vì đây không phải số liệu đọc từ Health Connect thật: nếu sau này có nguồn
// thật cho cùng ngày thì số liệu thật được ưu tiên (BR-042).
const DEV_SAMPLE_METRICS = {
  steps: 6240,
  burnedCalories: 180,
  distanceMeters: 4300,
  source: 'Manual',
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
  // Ở DEV gửi số liệu mẫu để thử luồng Dashboard/CalorieBudget với BE thật; ngoài DEV báo rõ thay
  // vì im lặng không làm gì. BE thay thế số liệu của (ngày, nguồn) nên bấm lặp chỉ làm mới mốc giờ
  // đồng bộ, không nhân đôi số bước.
  async syncNow() {
    if (!__DEV__) {
      throw new Error('Đồng bộ Health Connect cần bản Dev Client — chưa hỗ trợ trên bản này.');
    }

    await healthSyncService.syncMetrics({ dateIso: todayIso(), ...DEV_SAMPLE_METRICS });
  },
};
