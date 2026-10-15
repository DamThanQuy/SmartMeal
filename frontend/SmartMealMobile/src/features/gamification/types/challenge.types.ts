// design/Challenges.dc.html, ChallengeComplete.dc.html (BR-211, BR-212 — business_rule.md hiện
// chưa có đúng số BR này, dựng theo docs/design.md mục 37 + artboard).

export interface Challenge {
  id: string;
  title: string;
  description: string;
  /** ISO date yyyy-MM-dd — chỉ cho tham gia khi hôm nay nằm trong [startIso, endIso] (BR-211). */
  startIso: string;
  endIso: string;
  xpReward: number;
  /** Id trong BADGE_DEFINITIONS (badge.types.ts) — mở khi hoàn thành. */
  badgeId?: string;
  /** Id trong COSTUME_DEFINITIONS — mở khi hoàn thành (design/ChallengeComplete.dc.html "Ba lô"). */
  costumeId?: string;
  joined: boolean;
  /** true khi user đã hoàn thành VÀ đã nhận thưởng (BR-212, đúng 1 lần). */
  completed: boolean;
}

export type ChallengeWindowState = 'active' | 'upcoming' | 'ended';

/** BR-211 — windowState tính bằng date-fns (không so chuỗi), đúng 1 chỗ trong challengeService. */
export interface ChallengeWithWindow extends Challenge {
  windowState: ChallengeWindowState;
  /** Hôm nay là ngày thứ mấy của khung (1…dayTotal). */
  dayCurrent: number;
  dayTotal: number;
  /** Số ngày trong khung đã đạt mục tiêu của thử thách (server tính từ nhật ký/nước/vận động). */
  completedDays: number;
  /** Tên phần thưởng do server đặt (vd. "Hydration Master") khi không khớp huy hiệu nào của app. */
  rewardLabel?: string;
}
