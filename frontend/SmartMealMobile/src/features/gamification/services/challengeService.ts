import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { createChallengesSeedMock } from '../mocks/challenges.mock';
import type {
  Challenge,
  ChallengeWindowState,
  ChallengeWithWindow,
} from '../types/challenge.types';
import { awardXpOnce } from './xpLedger';

// TODO: replace mock with real API — theo đúng pattern nutritionService (in-memory store mô
// phỏng Backend cho nhánh feat/mock-ui).

let challenges: Challenge[] = createChallengesSeedMock();

// BR-211 — hôm nay phải nằm trong [Start, End] mới cho tham gia; dùng date-fns (startOfDay so
// sánh theo ngày lịch), không so chuỗi ISO trực tiếp (sai lệch giữa các độ dài chuỗi/giờ).
function computeWindowState(challenge: Challenge): ChallengeWindowState {
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(challenge.startIso));
  const end = startOfDay(new Date(challenge.endIso));
  if (today < start) return 'upcoming';
  if (today > end) return 'ended';
  return 'active';
}

function withWindow(challenge: Challenge): ChallengeWithWindow {
  const windowState = computeWindowState(challenge);
  const start = startOfDay(new Date(challenge.startIso));
  const end = startOfDay(new Date(challenge.endIso));
  const today = startOfDay(new Date());
  const dayTotal = differenceInCalendarDays(end, start) + 1;
  const dayCurrent = Math.min(dayTotal, Math.max(1, differenceInCalendarDays(today, start) + 1));
  return { ...challenge, windowState, dayCurrent, dayTotal };
}

export const challengeService = {
  async getChallenges(): Promise<ChallengeWithWindow[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải danh sách thử thách, vui lòng thử lại.');
    }
    if (scenario === 'empty') return [];
    return challenges.map(withWindow);
  },

  // BR-211 — chỉ cho tham gia khi đang trong khung [Start, End].
  async joinChallenge(challengeId: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tham gia, vui lòng thử lại.');
    }
    const challenge = challenges.find(item => item.id === challengeId);
    if (!challenge) throw new Error('Không tìm thấy thử thách.');
    if (computeWindowState(challenge) !== 'active') {
      throw new Error('Thử thách chưa mở hoặc đã kết thúc.');
    }
    challenges = challenges.map(item => (item.id === challengeId ? { ...item, joined: true } : item));
  },

  // BR-212 — hoàn thành thử thách, thưởng XP/huy hiệu/trang phục đúng 1 lần (awardXpOnce dùng
  // chung sổ XP với Diary/WaterLog — xpLedger.ts). Nhánh feat/mock-ui: chưa chờ đủ 7 ngày thật
  // được nên "Xem chi tiết" ở ChallengesScreen mô phỏng luôn kết quả hoàn thành.
  async completeChallenge(challengeId: string): Promise<Challenge> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể hoàn thành thử thách, vui lòng thử lại.');
    }
    const challenge = challenges.find(item => item.id === challengeId);
    if (!challenge) throw new Error('Không tìm thấy thử thách.');

    awardXpOnce(`challenge-${challengeId}`, challenge.xpReward);
    const updated: Challenge = { ...challenge, joined: true, completed: true };
    challenges = challenges.map(item => (item.id === challengeId ? updated : item));
    return updated;
  },

  async getChallengeById(challengeId: string): Promise<Challenge | undefined> {
    return challenges.find(item => item.id === challengeId);
  },
};

/** Đọc đồng bộ (ngoài React Query) — badgeService dùng để tính huy hiệu/trang phục mở theo
 * thử thách đã hoàn thành, không cần round-trip mock delay riêng. */
export function getCompletedChallengeIds(): string[] {
  return challenges.filter(challenge => challenge.completed).map(challenge => challenge.id);
}

// BR-271 — DeleteDataScreen: thử thách đã tham gia/hoàn thành về lại seed khởi tạo.
registerUserDataReset('challenges', () => {
  challenges = createChallengesSeedMock();
});
