import { format } from 'date-fns';
import { gamificationService } from '@/features/gamification';
import {
  healthSyncService,
  nutritionService,
  todayIso,
  type DailyActivity,
} from '@/features/nutrition';
import { parseApiDateTime } from '@/utils/date';
import {
  RECOMMENDED_MEAL_MOCK,
  RECOMMENDED_MEALS_MOCK,
} from '../mocks/dashboard.mock';
import type {
  ActivitySummary,
  DashboardSummary,
  PetSnippet,
} from '../types/dashboard.types';

// TODO: replace mock with real API — recommendedMeal sẽ đến từ feature recipes AI suggestion khi
// có. Loading/Empty/Error của cả Dashboard đi theo đúng 1 nguồn (nutritionService.getDiaryDay) để
// nhất quán với Diary — không tự thêm delay/scenario riêng ở đây.
function toPetSnippet(
  pet: Awaited<ReturnType<typeof gamificationService.getPetState>>,
): PetSnippet {
  return {
    name: pet.name,
    level: pet.level,
    streakDays: pet.streakDays,
    progressPercent: Math.round((pet.xpIntoLevel / pet.xpPerLevel) * 100),
    message: pet.message,
  };
}

function toActivitySummary(activity: DailyActivity): ActivitySummary {
  return {
    steps: activity.steps,
    caloriesBurned: activity.caloriesBurned,
    syncedAtLabel: activity.lastSyncedAt
      ? format(parseApiDateTime(activity.lastSyncedAt), 'HH:mm')
      : null,
    sourceLabel: activity.sources.join(', '),
  };
}

export const dashboardService = {
  // Backend không có endpoint tổng hợp nên Dashboard gom từ nhiều nguồn song song. allSettled: một
  // nguồn phụ lỗi (vận động, Bé Mầm) chỉ làm khối đó biến mất; nhật ký lỗi mới đáng báo lỗi cả màn.
  async getDashboardSummary(): Promise<DashboardSummary> {
    const dateIso = todayIso();
    const [diaryResult, activityResult, petResult] = await Promise.allSettled([
      nutritionService.getDiaryDay(dateIso),
      healthSyncService.getDailySummary(dateIso),
      gamificationService.getPetState(),
    ]);

    if (diaryResult.status === 'rejected') throw diaryResult.reason;

    return {
      diary: diaryResult.value,
      activity:
        activityResult.status === 'fulfilled'
          ? toActivitySummary(activityResult.value)
          : null,
      pet:
        petResult.status === 'fulfilled' ? toPetSnippet(petResult.value) : null,
      recommendedMeal: RECOMMENDED_MEAL_MOCK,
      recommendedMeals: RECOMMENDED_MEALS_MOCK,
    };
  },
};
