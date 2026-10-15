import { todayIso } from '@/features/nutrition';
import { api, ENDPOINTS } from '@/services/api';
import type { HealthPetStatusDto, StreakStatusDto } from '../types/gamification.api.types';
import type { PetState } from '../types/gamification.types';
import { challengeService } from './challengeService';
import { fromPetStatus } from './gamification.mapper';

// Bản gọi backend thật cho Bé Mầm: cấp, XP và nhiệm vụ hôm nay do server tính và cộng XP (BR-202) —
// FE không tự tính lại nhiệm vụ từ nhật ký/nước như bản PR #9 (review G1). `date` = ngày theo giờ máy.
export const gamificationApiService = {
  async getPetState(): Promise<PetState> {
    const date = todayIso();
    const params = { params: { date } };
    const [pet, streak, challenges] = await Promise.all([
      api.get<HealthPetStatusDto>(ENDPOINTS.gamification.pet, params),
      api.get<StreakStatusDto>(ENDPOINTS.gamification.streak, params),
      // Thử thách chỉ là phần phụ của màn Bé Mầm: lỗi thì vẫn hiện pet, không có thẻ thử thách.
      challengeService.getChallenges().catch(() => []),
    ]);
    return fromPetStatus(pet, streak, challenges, date);
  },
};
