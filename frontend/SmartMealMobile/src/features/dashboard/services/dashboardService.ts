import { nutritionService, todayIso } from '@/features/nutrition';
import { ACTIVITY_SUMMARY_MOCK, PET_SNIPPET_MOCK, RECOMMENDED_MEAL_MOCK } from '../mocks/dashboard.mock';
import type { DashboardSummary } from '../types/dashboard.types';

// TODO: replace mock with real API — activity/pet/recommendedMeal sẽ đến từ Health Connect
// service, feature gamification (Đợt 8) và feature recipes (Đợt 5) khi các đợt đó dựng xong.
// Loading/Empty/Error của cả Dashboard đi theo đúng 1 nguồn (nutritionService.getDiaryDay) để
// nhất quán với Diary — không tự thêm delay/scenario riêng ở đây.
export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const diary = await nutritionService.getDiaryDay(todayIso());
    return {
      diary,
      activity: ACTIVITY_SUMMARY_MOCK,
      pet: PET_SNIPPET_MOCK,
      recommendedMeal: RECOMMENDED_MEAL_MOCK,
    };
  },
};
