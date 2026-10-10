import { todayIso } from '@/utils/date';
import { nutritionService } from '@/features/nutrition/services/nutritionService';
import { api, ENDPOINTS } from '@/services/api';
import type { PetChallenge, PetState, PetTaskItem } from '../types/gamification.types';
import type { HealthPetStatusDto, StreakStatusDto } from '../types/gamification.api.types';
import { challengeService } from './challengeService';
import type { gamificationMockService } from './gamificationService.mock';
import { CUP_ML, waterService } from './waterService';

const BREAKFAST_XP = 10;
const PROTEIN_XP = 20;
const WATER_XP = 10;

export const gamificationApiService: Partial<typeof gamificationMockService> = {
  async getPetState(): Promise<PetState> {
    const dateIso = todayIso();

    // Gọi song song BE pet, streak, nhật ký, nước và thử thách
    const [petDto, streakDto, diary, waterSummary, challenges] = await Promise.all([
      api.get<HealthPetStatusDto>(ENDPOINTS.gamification.pet),
      api.get<StreakStatusDto>(ENDPOINTS.gamification.streak),
      nutritionService.getDiaryDay(dateIso).catch(() => null),
      waterService.getDaySummary(dateIso).catch(() => null),
      challengeService.getChallenges().catch(() => []),
    ]);

    // 1. Tính toán nhiệm vụ trong ngày (breakfast, protein, water)
    const breakfastDone = (diary?.entriesByMeal.breakfast.length ?? 0) > 0;
    const proteinConsumed = diary
      ? diary.entriesByMeal.breakfast
          .concat(diary.entriesByMeal.lunch, diary.entriesByMeal.dinner, diary.entriesByMeal.snack)
          .reduce((sum, entry) => sum + entry.nutrition.proteinG, 0)
      : 0;
    const proteinTarget = diary?.macroTargets.proteinG ?? 0;
    const proteinDone = proteinTarget > 0 && proteinConsumed >= proteinTarget;

    const totalWaterMl = waterSummary?.totalMl ?? 0;
    const goalWaterMl = waterSummary?.goalMl ?? 2000;
    const cupsToday = Math.round(totalWaterMl / CUP_ML);
    const cupsTarget = Math.round(goalWaterMl / CUP_ML);
    const waterDone = totalWaterMl >= goalWaterMl;

    const tasks: PetTaskItem[] = [
      {
        id: 'breakfast',
        label: 'Ghi bữa sáng',
        xpReward: BREAKFAST_XP,
        progressCurrent: breakfastDone ? 1 : 0,
        progressTarget: 1,
        progressLabel: breakfastDone ? 'Xong' : 'Chưa ghi',
        completed: breakfastDone,
      },
      {
        id: 'protein',
        label: 'Đạt mục tiêu protein',
        xpReward: PROTEIN_XP,
        progressCurrent: proteinConsumed,
        progressTarget: proteinTarget,
        progressLabel: `${proteinConsumed}/${proteinTarget} g`,
        completed: proteinDone,
      },
      {
        id: 'water',
        label: 'Uống đủ nước',
        xpReward: WATER_XP,
        progressCurrent: cupsToday,
        progressTarget: cupsTarget,
        progressLabel: `${cupsToday}/${cupsTarget} ly`,
        completed: waterDone,
      },
    ];

    // 2. Lấy thông tin thử thách đang tham gia (nếu có)
    const activeChallenge = challenges.find(c => c.joined && !c.completed);
    const challengeInfo: PetChallenge = activeChallenge
      ? {
          title: activeChallenge.title,
          dayCurrent: activeChallenge.dayCurrent,
          dayTotal: activeChallenge.dayTotal,
          xpReward: activeChallenge.xpReward,
        }
      : {
          title: challenges[0]?.title ?? 'Thử thách dinh dưỡng',
          dayCurrent: 1,
          dayTotal: challenges[0]?.dayTotal ?? 7,
          xpReward: challenges[0]?.xpReward ?? 100,
        };

    // 3. Chuỗi ngày hoàn thành tuần từ server Streak
    const weekCompletion: boolean[] = Array.from({ length: 7 }, (_, i) => {
      const day = streakDto.recentActivity?.[i];
      return day ? day.hasLogged : false;
    });

    return {
      name: petDto.petName || 'Bé Mầm',
      level: petDto.level,
      xpIntoLevel: petDto.exp,
      xpPerLevel: petDto.nextLevelExp || 100,
      streakDays: streakDto.currentStreak,
      weekCompletion,
      tasks,
      challenge: challengeInfo,
      message: petDto.statusMessage || 'Hôm nay bạn làm rất tốt! Cùng tiếp tục duy trì nhé.',
    };
  },
};
