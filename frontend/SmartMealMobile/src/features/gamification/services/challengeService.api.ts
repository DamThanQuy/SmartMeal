import { addDays, format } from 'date-fns';
import { api, ENDPOINTS } from '@/services/api';
import type { Challenge, ChallengeWithWindow } from '../types/challenge.types';
import type { ChallengeApiDto } from '../types/challenge.api.types';
import type { challengeMockService } from './challengeService.mock';
import { awardXpOnce } from './xpLedger';

function mapChallengeDto(dto: ChallengeApiDto): ChallengeWithWindow {
  const duration = dto.durationDays || 7;
  const completedDays = dto.completedDays || 0;
  const isCompleted = dto.isCompleted;
  const isJoined = dto.isJoined;

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    startIso: format(new Date(), 'yyyy-MM-dd'),
    endIso: format(addDays(new Date(), duration), 'yyyy-MM-dd'),
    xpReward: dto.rewardExp,
    badgeId: dto.rewardBadge || undefined,
    costumeId: undefined,
    joined: isJoined,
    completed: isCompleted,
    windowState: isCompleted ? 'ended' : 'active',
    dayCurrent: Math.max(1, Math.min(duration, isJoined ? (completedDays || 1) : 1)),
    dayTotal: duration,
  };
}

export const challengeApiService: Partial<typeof challengeMockService> = {
  async getChallenges(): Promise<ChallengeWithWindow[]> {
    const dtos = await api.get<ChallengeApiDto[]>(ENDPOINTS.gamification.challenges);
    return dtos.map(mapChallengeDto);
  },

  async joinChallenge(challengeId: string): Promise<void> {
    await api.post<ChallengeApiDto>(ENDPOINTS.gamification.joinChallenge(challengeId));
  },

  async completeChallenge(challengeId: string): Promise<Challenge> {
    const list = await this.getChallenges?.();
    const target = list?.find(item => item.id === challengeId);
    if (target) {
      awardXpOnce(`challenge-${challengeId}`, target.xpReward);
      return { ...target, joined: true, completed: true };
    }
    throw new Error('Không tìm thấy thử thách để hoàn thành.');
  },

  async getChallengeById(challengeId: string): Promise<Challenge | undefined> {
    const list = await this.getChallenges?.();
    return list?.find(item => item.id === challengeId);
  },
};
