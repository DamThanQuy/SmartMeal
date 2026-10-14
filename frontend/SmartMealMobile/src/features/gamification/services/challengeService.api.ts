import { todayIso } from '@/features/nutrition';
import { api, ENDPOINTS } from '@/services/api';
import type { ChallengeApiDto } from '../types/challenge.api.types';
import type { ChallengeWithWindow } from '../types/challenge.types';
import { fromChallengeDto } from './gamification.mapper';
import type { challengeMockService } from './challengeService.mock';

// Bản gọi backend thật cho thử thách. Server tự tính tiến độ và tự hoàn thành thử thách (cộng XP đúng
// một lần — BR-212); không có endpoint "complete" và FE không cộng XP ở máy (review PR #9 G3).
// `date` = ngày theo giờ máy: không gửi thì BE lấy ngày UTC, lệch một ngày từ 0h–7h giờ Việt Nam.

export const challengeApiService: Partial<typeof challengeMockService> = {
  async getChallenges(): Promise<ChallengeWithWindow[]> {
    const date = todayIso();
    const dtos = await api.get<ChallengeApiDto[]>(ENDPOINTS.gamification.challenges, { params: { date } });
    return dtos.map(dto => fromChallengeDto(dto, date));
  },

  // POST /gamification/challenges/{id}/join — idempotent, khung ngày bắt đầu từ hôm nay.
  async joinChallenge(challengeId: string): Promise<void> {
    await api.post<ChallengeApiDto>(ENDPOINTS.gamification.joinChallenge(challengeId), undefined, {
      params: { date: todayIso() },
    });
  },

  async getChallengeById(challengeId: string): Promise<ChallengeWithWindow | undefined> {
    const challenges = await challengeApiService.getChallenges?.();
    return challenges?.find(challenge => challenge.id === challengeId);
  },
};
