/**
 * dashboardService (docs/fetch-api/part1 §8): BE không có endpoint tổng hợp nên Dashboard gom từ
 * nhiều nguồn song song. Chỉ nhật ký lỗi mới làm hỏng cả màn; vận động/Bé Mầm lỗi thì khối đó
 * biến mất. Các service nguồn được mock.
 */
import { format } from 'date-fns';
import type { DiaryDaySummary } from '@/features/nutrition/types/nutrition.types';
import type { DailyActivity } from '@/features/nutrition/types/healthSync.types';

const DIARY: DiaryDaySummary = {
  date: '2026-10-02',
  calorieTarget: 1776,
  activityCalories: 180,
  entriesByMeal: { breakfast: [], lunch: [], dinner: [], snack: [] },
  macroTargets: { proteinG: 111, carbsG: 222, fatG: 49 },
};

const ACTIVITY: DailyActivity = {
  dateIso: '2026-10-02',
  steps: 6240,
  stepGoal: 10000,
  caloriesBurned: 180,
  distanceMeters: 4700,
  sources: ['Health Connect', 'GoogleFit'],
  lastSyncedAt: '2026-10-02T01:30:00Z',
  hasSyncedData: true,
  sourceDetails: [],
  activities: [],
};

const PET = {
  name: 'Bé Mầm',
  level: 3,
  streakDays: 5,
  xpIntoLevel: 45,
  xpPerLevel: 120,
  message: 'Hôm nay ăn ngon nhé!',
};

function load() {
  const nutritionMock = { getDiaryDay: jest.fn() };
  const healthSyncMock = { getDailySummary: jest.fn() };
  const gamificationMock = { getPetState: jest.fn() };

  jest.resetModules();
  jest.doMock('@/features/nutrition', () => ({
    nutritionService: nutritionMock,
    healthSyncService: healthSyncMock,
    todayIso: () => '2026-10-02',
  }));
  jest.doMock('@/features/gamification', () => ({ gamificationService: gamificationMock }));

  const { dashboardService } =
    require('@/features/dashboard/services/dashboardService') as typeof import('@/features/dashboard/services/dashboardService');

  nutritionMock.getDiaryDay.mockResolvedValue(DIARY);
  healthSyncMock.getDailySummary.mockResolvedValue(ACTIVITY);
  gamificationMock.getPetState.mockResolvedValue(PET);

  return { dashboardService, nutritionMock, healthSyncMock, gamificationMock };
}

describe('getDashboardSummary', () => {
  test('gom nhật ký, vận động và Bé Mầm của hôm nay (cùng một ngày giờ máy)', async () => {
    const { dashboardService, nutritionMock, healthSyncMock } = load();

    const summary = await dashboardService.getDashboardSummary();

    expect(nutritionMock.getDiaryDay).toHaveBeenCalledWith('2026-10-02');
    expect(healthSyncMock.getDailySummary).toHaveBeenCalledWith('2026-10-02');
    expect(summary.diary).toBe(DIARY);
    expect(summary.pet).toEqual({
      name: 'Bé Mầm',
      level: 3,
      streakDays: 5,
      progressPercent: 38,
      message: 'Hôm nay ăn ngon nhé!',
    });
    expect(summary.recommendedMeal.recipeId).toBeDefined();
  });

  test('vận động: giờ đồng bộ theo giờ máy và nhãn nguồn', async () => {
    const { dashboardService } = load();

    const { activity } = await dashboardService.getDashboardSummary();

    expect(activity).toEqual({
      steps: 6240,
      caloriesBurned: 180,
      syncedAtLabel: format(new Date('2026-10-02T01:30:00Z'), 'HH:mm'),
      sourceLabel: 'Health Connect, GoogleFit',
    });
  });

  test('hôm nay chưa đồng bộ → không có nhãn giờ (UI không hiện "vừa đồng bộ")', async () => {
    const { dashboardService, healthSyncMock } = load();
    healthSyncMock.getDailySummary.mockResolvedValue({
      ...ACTIVITY,
      steps: 0,
      caloriesBurned: 0,
      sources: [],
      lastSyncedAt: null,
      hasSyncedData: false,
    });

    const { activity } = await dashboardService.getDashboardSummary();

    expect(activity).toEqual({ steps: 0, caloriesBurned: 0, syncedAtLabel: null, sourceLabel: '' });
  });

  test('Bé Mầm lỗi → khối pet biến mất, Dashboard vẫn hiện', async () => {
    const { dashboardService, gamificationMock } = load();
    gamificationMock.getPetState.mockRejectedValue(new Error('Pet lỗi'));

    const summary = await dashboardService.getDashboardSummary();

    expect(summary.pet).toBeNull();
    expect(summary.diary).toBe(DIARY);
    expect(summary.activity).not.toBeNull();
  });

  test('vận động lỗi → khối vận động biến mất, Dashboard vẫn hiện', async () => {
    const { dashboardService, healthSyncMock } = load();
    healthSyncMock.getDailySummary.mockRejectedValue(new Error('Mất mạng'));

    const summary = await dashboardService.getDashboardSummary();

    expect(summary.activity).toBeNull();
    expect(summary.pet).not.toBeNull();
  });

  test('nhật ký lỗi → báo lỗi cả màn (kể cả khi các nguồn khác vẫn ổn)', async () => {
    const { dashboardService, nutritionMock } = load();
    const error = new Error('Không thể tải nhật ký.');
    nutritionMock.getDiaryDay.mockRejectedValue(error);

    await expect(dashboardService.getDashboardSummary()).rejects.toBe(error);
  });
});
