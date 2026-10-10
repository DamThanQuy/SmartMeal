import { nutritionService, todayIso } from '@/features/nutrition';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { CUP_ML, waterService } from './waterService';
import {
  awardXpOnce,
  computeLevel,
  getStreakDays,
  getWeekCompletion,
  resetXpLedger,
  XP_PER_LEVEL,
} from './xpLedger';
import type { PetState, PetTaskItem } from '../types/gamification.types';

const BREAKFAST_XP = 10;
const PROTEIN_XP = 20;
export const WATER_XP = 10;

export const gamificationMockService = {
  async getPetState(): Promise<PetState> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải dữ liệu Bé Mầm, vui lòng thử lại.');
    }

    const dateIso = todayIso();
    const diary = await nutritionService.getDiaryDay(dateIso);
    const breakfastDone = diary.entriesByMeal.breakfast.length > 0;
    const proteinConsumed = diary.entriesByMeal.breakfast
      .concat(diary.entriesByMeal.lunch, diary.entriesByMeal.dinner, diary.entriesByMeal.snack)
      .reduce((sum, entry) => sum + entry.nutrition.proteinG, 0);
    const proteinTarget = diary.macroTargets.proteinG;
    const proteinDone = proteinTarget > 0 && proteinConsumed >= proteinTarget;

    const waterSummary = await waterService.getDaySummary(dateIso);
    const cupsToday = Math.round(waterSummary.totalMl / CUP_ML);
    const cupsTarget = Math.round(waterSummary.goalMl / CUP_ML);
    const waterDone = waterSummary.totalMl >= waterSummary.goalMl;

    if (breakfastDone) awardXpOnce(`breakfast-${dateIso}`, BREAKFAST_XP);
    if (proteinDone) awardXpOnce(`protein-${dateIso}`, PROTEIN_XP);
    if (waterDone) awardXpOnce(`water-${dateIso}`, WATER_XP);

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

    const { level, xpIntoLevel } = computeLevel();

    return {
      name: 'Bé Mầm',
      level,
      xpIntoLevel,
      xpPerLevel: XP_PER_LEVEL,
      streakDays: getStreakDays(),
      weekCompletion: getWeekCompletion(),
      tasks,
      challenge: { title: '7 ngày Eat Clean', dayCurrent: 4, dayTotal: 7, xpReward: 100 },
      message:
        breakfastDone && proteinDone
          ? 'Hôm nay bạn làm rất tốt!'
          : 'Hôm nay bạn làm rất tốt! Uống thêm nước để Bé Mầm vui hơn nhé.',
    };
  },
};

registerUserDataReset('gamification', resetXpLedger);
