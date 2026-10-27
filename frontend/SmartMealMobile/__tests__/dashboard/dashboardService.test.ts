/**
 * dashboardService (docs/fetch-api/part1 §8): BE không có endpoint tổng hợp nên Dashboard gom từ
 * nhiều nguồn song song. Chỉ nhật ký lỗi mới làm hỏng cả màn; Bé Mầm/gợi ý món lỗi thì khối đó
 * biến mất. Các service nguồn được mock.
 */
import type { DiaryDaySummary } from '@/features/nutrition/types/nutrition.types';

const DIARY: DiaryDaySummary = {
  date: '2026-10-02',
  calorieTarget: 1776,
  entriesByMeal: { breakfast: [], lunch: [], dinner: [], snack: [] },
  macroTargets: { proteinG: 111, carbsG: 222, fatG: 49 },
};

const PET = {
  name: 'Bé Mầm',
  level: 3,
  streakDays: 5,
  xpIntoLevel: 45,
  xpPerLevel: 120,
  message: 'Hôm nay ăn ngon nhé!',
};

function recipe(id: string, calories: number) {
  return {
    id,
    name: `Món ${id}`,
    durationMinutes: 20,
    servings: 1,
    nutritionPerServing: { calories, proteinG: 10, carbsG: 10, fatG: 10 },
    tags: ['eatClean'],
    mealTypes: [],
    ingredients: [],
    steps: [],
    allergenIds: [],
    healthWarnings: [],
  };
}

function load() {
  const nutritionMock = { getDiaryDay: jest.fn() };
  const gamificationMock = { getPetState: jest.fn() };
  const recipeMock = { getRecommended: jest.fn() };

  jest.resetModules();
  jest.doMock('@/features/nutrition', () => ({
    nutritionService: nutritionMock,
    todayIso: () => '2026-10-02',
  }));
  jest.doMock('@/features/gamification', () => ({ gamificationService: gamificationMock }));
  jest.doMock('@/features/recipes', () => ({
    recipeService: recipeMock,
    RECIPE_TAG_OPTIONS: [{ id: 'eatClean', label: 'Eat Clean' }],
  }));

  const { dashboardService } =
    require('@/features/dashboard/services/dashboardService') as typeof import('@/features/dashboard/services/dashboardService');

  nutritionMock.getDiaryDay.mockResolvedValue(DIARY);
  gamificationMock.getPetState.mockResolvedValue(PET);
  recipeMock.getRecommended.mockResolvedValue({
    recipes: [recipe('a', 900), recipe('b', 450), recipe('c', 2500)],
    excludedAllergenIds: [],
  });

  return { dashboardService, nutritionMock, gamificationMock, recipeMock };
}

describe('getDashboardSummary', () => {
  test('gom nhật ký và Bé Mầm của hôm nay (cùng một ngày giờ máy)', async () => {
    const { dashboardService, nutritionMock } = load();

    const summary = await dashboardService.getDashboardSummary();

    expect(nutritionMock.getDiaryDay).toHaveBeenCalledWith('2026-10-02');
    expect(summary.diary).toBe(DIARY);
    expect(summary.pet).toEqual({
      name: 'Bé Mầm',
      level: 3,
      streakDays: 5,
      progressPercent: 38,
      message: 'Hôm nay ăn ngon nhé!',
    });
    // Còn 1776 kcal: món 900 kcal gần nhất mà không vượt, rồi 450; món 2500 kcal bị đẩy xuống.
    expect(summary.recommendedMeals.map(meal => meal.recipeId)).toEqual(['a', 'b']);
    expect(summary.recommendedMeals[0]).toMatchObject({ tag: 'Eat Clean', calories: 900 });
  });

  test('Bé Mầm lỗi → khối pet biến mất, Dashboard vẫn hiện', async () => {
    const { dashboardService, gamificationMock } = load();
    gamificationMock.getPetState.mockRejectedValue(new Error('Pet lỗi'));

    const summary = await dashboardService.getDashboardSummary();

    expect(summary.pet).toBeNull();
    expect(summary.diary).toBe(DIARY);
  });

  test('công thức lỗi → không có gợi ý, Dashboard vẫn hiện', async () => {
    const { dashboardService, recipeMock } = load();
    recipeMock.getRecommended.mockRejectedValue(new Error('Mất mạng'));

    const summary = await dashboardService.getDashboardSummary();

    expect(summary.recommendedMeals).toEqual([]);
    expect(summary.diary).toBe(DIARY);
  });

  test('nhật ký lỗi → báo lỗi cả màn (kể cả khi các nguồn khác vẫn ổn)', async () => {
    const { dashboardService, nutritionMock } = load();
    const error = new Error('Không thể tải nhật ký.');
    nutritionMock.getDiaryDay.mockRejectedValue(error);

    await expect(dashboardService.getDashboardSummary()).rejects.toBe(error);
  });
});
