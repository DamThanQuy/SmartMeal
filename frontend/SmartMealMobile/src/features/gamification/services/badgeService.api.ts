import { todayIso } from '@/features/nutrition';
import { api, ENDPOINTS } from '@/services/api';
import type { BadgesSummaryDto } from '../types/gamification.api.types';
import type { BadgesSummary } from '../types/badge.types';
import type { badgeMockService } from './badgeService.mock';
import { fromBadgesSummaryDto } from './gamification.mapper';

// Bản gọi backend thật cho huy hiệu/trang phục: trạng thái mở khóa và trang phục đang mặc lưu trên
// server (review PR #9 G5) — không tính ở máy từ sổ XP cục bộ.
export const badgeApiService: Partial<typeof badgeMockService> = {
  async getBadgesSummary(): Promise<BadgesSummary> {
    return fromBadgesSummaryDto(
      await api.get<BadgesSummaryDto>(ENDPOINTS.gamification.badges, { params: { date: todayIso() } }),
    );
  },

  // POST /gamification/costumes/{id}/equip — 400 nếu chưa mở khóa.
  async equipCostume(costumeId: string): Promise<void> {
    await api.post<BadgesSummaryDto>(ENDPOINTS.gamification.equipCostume(costumeId), undefined, {
      params: { date: todayIso() },
    });
  },

  // DELETE /gamification/costumes/equipped — tháo trang phục đang mặc.
  async unequipCostume(): Promise<void> {
    await api.delete<BadgesSummaryDto>(ENDPOINTS.gamification.unequipCostume, {
      params: { date: todayIso() },
    });
  },
};
