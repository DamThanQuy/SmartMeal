import type { RecommendedMeal } from '../types/dashboard.types';

// design/Dashboard.dc.html mục Gợi ý bữa tối — Recipes AI suggestion chưa có nguồn thật nên tĩnh,
// không tương tác (xem báo cáo Đợt 2; 🔴 mock-only trong docs/fetch-api/part1 §13). Vận động nay
// đọc từ healthSyncService (features/nutrition), Pet từ features/gamification — xem
// dashboardService.ts.
export const RECOMMENDED_MEAL_MOCK: RecommendedMeal = {
  recipeId: 'recipe1',
  name: 'Gà áp chảo rau củ',
  durationMinutes: 25,
  calories: 420,
  tag: 'Eat Clean',
};
