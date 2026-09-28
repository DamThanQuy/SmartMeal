// BR-202 ("không cộng trùng XP cho cùng 1 sự kiện") — sổ XP DÙNG CHUNG cho mọi nguồn cộng XP
// (Diary breakfast/protein, WaterLog, Challenges...) để tất cả đi qua đúng 1 awardXpOnce, tránh
// mỗi service tự giữ 1 bản xpTotal riêng dễ lệch/cộng trùng. Trước Đợt 12, state này nằm trực
// tiếp trong gamificationService.ts — tách ra đây khi Challenges/Badges (Đợt 12) cũng cần đọc/ghi.

export const XP_PER_LEVEL = 500;

// Seed khớp design/Pet.dc.html: Level 5, 400/500 XP → tổng XP từng nhận = (5-1)*500+400 = 2400.
const INITIAL_XP_TOTAL = 2400;
const INITIAL_STREAK_DAYS = 5;
const INITIAL_WEEK_COMPLETION = [true, true, true, true, true, false, false];

let xpTotal = INITIAL_XP_TOTAL;
let streakDays = INITIAL_STREAK_DAYS;
let weekCompletion = [...INITIAL_WEEK_COMPLETION];
const awardedEventIds = new Set<string>();

/** true nếu vừa cộng XP (sự kiện mới); false nếu eventId này đã được cộng trước đó (BR-202). */
export function awardXpOnce(eventId: string, xp: number): boolean {
  if (awardedEventIds.has(eventId)) return false;
  awardedEventIds.add(eventId);
  xpTotal += xp;
  return true;
}

export function getXpTotal(): number {
  return xpTotal;
}

export function computeLevel(): { level: number; xpIntoLevel: number } {
  return { level: Math.floor(xpTotal / XP_PER_LEVEL) + 1, xpIntoLevel: xpTotal % XP_PER_LEVEL };
}

export function getStreakDays(): number {
  return streakDays;
}

export function getWeekCompletion(): boolean[] {
  return [...weekCompletion];
}

// BR-271 — gọi từ gamificationService (giữ nguyên key 'gamification' đã đăng ký trước Đợt 12).
export function resetXpLedger(): void {
  xpTotal = INITIAL_XP_TOTAL;
  streakDays = INITIAL_STREAK_DAYS;
  weekCompletion = [...INITIAL_WEEK_COMPLETION];
  awardedEventIds.clear();
}
