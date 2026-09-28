import { groceryService } from '@/features/grocery';
import { currentWeekStartIso } from '@/features/meal-planner';
import { todayIso } from '@/features/nutrition';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import {
  BADGE_DEFINITIONS_MOCK,
  COSTUME_DEFINITIONS_MOCK,
  DEFAULT_EQUIPPED_COSTUME_ID,
} from '../mocks/badges.mock';
import type { BadgesSummary } from '../types/badge.types';
import { getCompletedChallengeIds } from './challengeService';
import { waterService } from './waterService';
import { computeLevel, getStreakDays, getXpTotal } from './xpLedger';

// TODO: replace mock with real API. Huy hiệu/trang phục tính LIVE từ các nguồn dữ liệu đã có
// (xpLedger, waterService, challengeService, groceryService) thay vì lưu 1 danh sách unlock
// riêng — tránh lệch giữa "đã mở" hiển thị và dữ liệu thật đang có (docs/ui-mock-prompts.md
// Phase 12: "huy hiệu mở khóa theo dữ liệu thật đang có").

let equippedCostumeId = DEFAULT_EQUIPPED_COSTUME_ID;

async function computeUnlockedBadgeIds(): Promise<Set<string>> {
  const unlocked = new Set<string>();
  const streakDays = getStreakDays();

  if (getXpTotal() > 0) unlocked.add('first-log');
  if (streakDays >= 3) unlocked.add('streak-3');
  if (streakDays >= 7) unlocked.add('streak-7');
  if (streakDays >= 30) unlocked.add('resilient-30');

  const waterWeek = await waterService.getWeekSummary(todayIso());
  if (waterWeek.daysOnTarget >= 1) unlocked.add('hydrated');

  if (getCompletedChallengeIds().includes('eat-clean-7')) unlocked.add('eat-clean-7');

  const groceryList = await groceryService.getGroceryList(currentWeekStartIso());
  if (groceryList.purchasedItems > 0) unlocked.add('grocery-shopper');

  // 'ai-snap-10' (chụp 10 bữa) và 'protein-goal' (đủ protein 5 ngày) chưa có bộ đếm tích lũy
  // nhiều ngày trong mock hiện tại — CẦN bổ sung khi có lịch sử diary nhiều ngày (xem báo cáo).
  return unlocked;
}

function isCostumeUnlocked(
  costumeId: string,
  level: number,
  streakDays: number,
  completedChallengeIds: string[],
): boolean {
  if (costumeId === 'straw-hat') return level >= 3;
  if (costumeId === 'sunglasses') return level >= 6;
  if (costumeId === 'green-scarf') return streakDays >= 7;
  if (costumeId === 'backpack') return completedChallengeIds.length > 0;
  return false;
}

export const badgeService = {
  // design/Badges.dc.html.
  async getBadgesSummary(): Promise<BadgesSummary> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải huy hiệu, vui lòng thử lại.');
    }

    const { level } = computeLevel();
    const streakDays = getStreakDays();
    const unlockedBadgeIds = scenario === 'empty' ? new Set<string>() : await computeUnlockedBadgeIds();
    const completedChallengeIds = getCompletedChallengeIds();

    const badges = BADGE_DEFINITIONS_MOCK.map(definition => ({
      ...definition,
      unlocked: unlockedBadgeIds.has(definition.id),
    }));
    const costumes = COSTUME_DEFINITIONS_MOCK.map(definition => ({
      ...definition,
      unlocked: isCostumeUnlocked(definition.id, level, streakDays, completedChallengeIds),
      equipped: definition.id === equippedCostumeId,
    }));

    return {
      petName: 'Bé Mầm',
      level,
      streakDays,
      unlockedBadgeCount: badges.filter(badge => badge.unlocked).length,
      totalBadgeCount: badges.length,
      badges,
      costumes,
    };
  },

  async equipCostume(costumeId: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể đổi trang phục, vui lòng thử lại.');
    }
    equippedCostumeId = costumeId;
  },
};

// BR-271 — DeleteDataScreen: trang phục đang mặc về lại mặc định.
registerUserDataReset('badges', () => {
  equippedCostumeId = DEFAULT_EQUIPPED_COSTUME_ID;
});
