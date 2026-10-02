import { ENDPOINTS, api } from '@/services/api';
import type { DailyHealthSyncSummaryDto } from '../types/healthSync.api.types';
import { fromDailySummaryDto } from './healthSync.mapper';
import type { healthSyncMockService } from './healthSyncService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §8–§9).
export const healthSyncApiService: Partial<typeof healthSyncMockService> = {
  // GET /health-sync/daily-summary?date= — luôn gửi ngày tường minh theo giờ máy (BE mặc định
  // lấy ngày UTC, lệch với giờ Việt Nam từ 00:00 đến 07:00).
  async getDailySummary(dateIso) {
    const dto = await api.get<DailyHealthSyncSummaryDto>(ENDPOINTS.healthSync.dailySummary, {
      params: { date: dateIso },
    });
    return fromDailySummaryDto(dto);
  },
};
