import type { ActivitySummary, PetSnippet, RecommendedMeal } from '../types/dashboard.types';

// design/Dashboard.dc.html mục Vận động/Pet/Gợi ý bữa tối — Health Connect, Pet (Đợt 8) và
// Recipes (Đợt 5) chưa dựng UI thật nên tạm mock tĩnh, không tương tác (xem báo cáo Đợt 2).
export const ACTIVITY_SUMMARY_MOCK: ActivitySummary = {
  steps: 6240,
  caloriesBurned: 180,
  syncedAtLabel: '08:30',
};

export const PET_SNIPPET_MOCK: PetSnippet = {
  name: 'Bé Mầm',
  level: 5,
  streakDays: 5,
  progressPercent: 80,
  message: 'Hôm nay bạn làm rất tốt!',
};

export const RECOMMENDED_MEAL_MOCK: RecommendedMeal = {
  name: 'Gà áp chảo rau củ',
  durationMinutes: 25,
  calories: 420,
  tag: 'Eat Clean',
};
