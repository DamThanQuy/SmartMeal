import { TODAY_ACTIVITY_CALORIES_BURNED_MOCK } from '@/features/nutrition';
import type { ActivitySummary, RecommendedMeal } from '../types/dashboard.types';

// design/Dashboard.dc.html mục Vận động/Gợi ý bữa tối — Health Connect (Đợt 7 mới có màn
// riêng, số liệu ở đây vẫn tĩnh) và Recipes AI suggestion chưa dựng nên tạm mock tĩnh, không
// tương tác (xem báo cáo Đợt 2). Pet giờ đọc từ features/gamification (Đợt 8) — xem
// dashboardService.ts. caloriesBurned đọc từ TODAY_ACTIVITY_CALORIES_BURNED_MOCK (nutrition) —
// trước Đợt 11 đây là 1 hằng số 180 riêng, trùng ngẫu nhiên với nutrition, nay chỉ có đúng 1
// nguồn để tránh lệch khi đổi số (BR-042, xem CalorieBudgetScreen).
export const ACTIVITY_SUMMARY_MOCK: ActivitySummary = {
  steps: 6240,
  caloriesBurned: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
  syncedAtLabel: '08:30',
};

export const RECOMMENDED_MEAL_MOCK: RecommendedMeal = {
  recipeId: 'recipe1',
  name: 'Gà áp chảo rau củ',
  durationMinutes: 25,
  calories: 420,
  tag: 'Eat Clean',
};
