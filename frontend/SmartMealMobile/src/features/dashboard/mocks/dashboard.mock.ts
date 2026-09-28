import type { ActivitySummary, RecommendedMeal } from '../types/dashboard.types';

// design/Dashboard.dc.html mục Vận động/Gợi ý bữa tối — Health Connect (Đợt 7 mới có màn
// riêng, số liệu ở đây vẫn tĩnh) và Recipes AI suggestion chưa dựng nên tạm mock tĩnh, không
// tương tác (xem báo cáo Đợt 2). Pet giờ đọc từ features/gamification (Đợt 8) — xem
// dashboardService.ts.
export const ACTIVITY_SUMMARY_MOCK: ActivitySummary = {
  steps: 6240,
  caloriesBurned: 180,
  syncedAtLabel: '08:30',
};

export const RECOMMENDED_MEAL_MOCK: RecommendedMeal = {
  name: 'Gà áp chảo rau củ',
  durationMinutes: 25,
  calories: 420,
  tag: 'Eat Clean',
};
