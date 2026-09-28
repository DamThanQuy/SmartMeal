import { gamificationService } from '@/features/gamification';
import { nutritionService, todayIso } from '@/features/nutrition';
import { ACTIVITY_SUMMARY_MOCK, RECOMMENDED_MEAL_MOCK } from '../mocks/dashboard.mock';
import type { DashboardSummary, PetSnippet } from '../types/dashboard.types';

// TODO: replace mock with real API — activity/recommendedMeal sẽ đến từ Health Connect service
// (Đợt 7) và feature recipes AI suggestion khi có. Loading/Empty/Error của cả Dashboard đi theo
// đúng 1 nguồn (nutritionService.getDiaryDay) để nhất quán với Diary — không tự thêm delay/
// scenario riêng ở đây.
function toPetSnippet(pet: Awaited<ReturnType<typeof gamificationService.getPetState>>): PetSnippet {
  return {
    name: pet.name,
    level: pet.level,
    streakDays: pet.streakDays,
    progressPercent: Math.round((pet.xpIntoLevel / pet.xpPerLevel) * 100),
    message: pet.message,
  };
}

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [diary, petState] = await Promise.all([
      nutritionService.getDiaryDay(todayIso()),
      gamificationService.getPetState(),
    ]);
    return {
      diary,
      activity: ACTIVITY_SUMMARY_MOCK,
      pet: toPetSnippet(petState),
      recommendedMeal: RECOMMENDED_MEAL_MOCK,
    };
  },
};
