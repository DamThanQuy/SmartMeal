import { ENDPOINTS, api } from '@/services/api';
import type {
  DailyHealthSyncSummaryDto,
  SyncHealthMetricsRequestDto,
} from '../types/healthSync.api.types';
import type { DailyActivity, SyncMetricsInput } from '../types/healthSync.types';
import { fromDailySummaryDto } from './healthSync.mapper';

// Bản gọi backend thật (docs/fetch-api/part1 §8–§9).
export const healthSyncApiService = {
  // GET /health-sync/daily-summary?date= — luôn gửi ngày tường minh theo giờ máy (BE mặc định
  // lấy ngày UTC, lệch với giờ Việt Nam từ 00:00 đến 07:00).
  async getDailySummary(dateIso: string): Promise<DailyActivity> {
    const dto = await api.get<DailyHealthSyncSummaryDto>(ENDPOINTS.healthSync.dailySummary, {
      params: { date: dateIso },
    });
    return fromDailySummaryDto(dto);
  },

  // POST /health-sync/steps-and-calories — gửi TỔNG của ngày từ một nguồn; BE thay thế giá trị cũ
  // của (ngày, nguồn) đó nên gửi lặp không làm số liệu nhân đôi.
  async syncMetrics(input: SyncMetricsInput): Promise<void> {
    await api.post<unknown, SyncHealthMetricsRequestDto>(ENDPOINTS.healthSync.stepsAndCalories, {
      date: input.dateIso,
      steps: input.steps,
      burnedCalories: input.burnedCalories,
      distanceMeters: input.distanceMeters,
      source: input.source,
    });
  },
};
