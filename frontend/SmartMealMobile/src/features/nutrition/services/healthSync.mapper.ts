import type { DailyHealthSyncSummaryDto } from '../types/healthSync.api.types';
import type { DailyActivity } from '../types/healthSync.types';

const ACTIVE_SOURCE_NOTE = 'Nguồn đang dùng cho hôm nay';
const SKIPPED_SOURCE_NOTE = 'Bị bỏ qua để không tính trùng với nguồn ưu tiên cao hơn';

/**
 * Chưa đồng bộ gì thì BE trả `sources` rỗng và `lastSyncedAt` null → "chưa đồng bộ" (đừng hiện
 * "vừa đồng bộ"). Một ngày chỉ dùng MỘT nguồn (BR-042): `activeSource` là nguồn được cộng vào ngân
 * sách, các nguồn còn lại chỉ để hiển thị là đã bị bỏ qua. BE chỉ có tên nguồn và tổng calo (không
 * tách theo nguồn, không có danh sách hoạt động).
 */
export function fromDailySummaryDto(dto: DailyHealthSyncSummaryDto): DailyActivity {
  const hasSyncedData = dto.sources.length > 0;
  const activeSource = dto.activeSource ?? dto.sources[0];

  return {
    dateIso: dto.date,
    steps: dto.steps,
    stepGoal: dto.stepGoal,
    caloriesBurned: Math.round(dto.burnedCalories),
    distanceMeters: dto.distanceMeters,
    sources: dto.sources,
    lastSyncedAt: hasSyncedData ? dto.lastSyncedAt : null,
    hasSyncedData,
    sourceDetails: dto.sources.map(name => ({
      id: name,
      label: name,
      countsTowardBudget: name === activeSource,
      note: name === activeSource ? ACTIVE_SOURCE_NOTE : SKIPPED_SOURCE_NOTE,
    })),
    activities: [],
  };
}
