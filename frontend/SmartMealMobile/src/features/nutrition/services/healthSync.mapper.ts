import type { DailyHealthSyncSummaryDto } from '../types/healthSync.api.types';
import type { DailyActivity } from '../types/healthSync.types';

const NO_SYNC_SOURCE = 'Manual';

/**
 * Ngày chưa có log nào BE vẫn trả `sources: ["Manual"]`, `steps: 0` và `lastSyncedAt = bây giờ` —
 * phải coi là "chưa đồng bộ" (docs/fetch-api/part1 §8), đừng hiện "vừa đồng bộ".
 */
export function fromDailySummaryDto(dto: DailyHealthSyncSummaryDto): DailyActivity {
  const hasOnlyPlaceholderSource = dto.sources.length === 1 && dto.sources[0] === NO_SYNC_SOURCE;
  const hasSyncedData = dto.steps > 0 || dto.burnedCalories > 0 || !hasOnlyPlaceholderSource;

  const sources = hasSyncedData ? dto.sources : [];

  return {
    dateIso: dto.date,
    steps: dto.steps,
    stepGoal: dto.stepGoal,
    caloriesBurned: Math.round(dto.burnedCalories),
    distanceMeters: dto.distanceMeters,
    sources,
    lastSyncedAt: hasSyncedData ? dto.lastSyncedAt : null,
    hasSyncedData,
    // BE chỉ có tên nguồn và tổng calo (không tách theo nguồn, không có danh sách hoạt động).
    sourceDetails: sources.map(name => ({
      id: name,
      label: name,
      countsTowardBudget: true,
      note: 'Nguồn đang dùng cho hôm nay',
    })),
    activities: [],
  };
}
