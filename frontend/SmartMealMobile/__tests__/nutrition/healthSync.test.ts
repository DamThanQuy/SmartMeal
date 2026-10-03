/**
 * healthSync (docs/fetch-api/part1 §8): số liệu vận động 1 ngày. Chưa đồng bộ gì thì BE trả
 * `sources: []` và `lastSyncedAt: null`; một ngày chỉ dùng MỘT nguồn ưu tiên cao nhất (BR-042).
 */
import { fromDailySummaryDto } from '@/features/nutrition/services/healthSync.mapper';
import type { DailyHealthSyncSummaryDto } from '@/features/nutrition/types/healthSync.api.types';

function dto(overrides: Partial<DailyHealthSyncSummaryDto> = {}): DailyHealthSyncSummaryDto {
  return {
    date: '2026-10-02',
    steps: 6240,
    stepGoal: 10000,
    burnedCalories: 180.4,
    consumedCalories: 1120,
    netCalories: 939.6,
    targetCalories: 1776,
    remainingCalories: 836.4,
    distanceMeters: 4700,
    sources: ['GoogleFit'],
    activeSource: 'GoogleFit',
    lastSyncedAt: '2026-10-02T01:30:00Z',
    ...overrides,
  };
}

describe('fromDailySummaryDto', () => {
  test('đã đồng bộ: giữ nguồn và giờ đồng bộ, làm tròn calo', () => {
    expect(fromDailySummaryDto(dto())).toEqual({
      dateIso: '2026-10-02',
      steps: 6240,
      stepGoal: 10000,
      caloriesBurned: 180,
      distanceMeters: 4700,
      sources: ['GoogleFit'],
      lastSyncedAt: '2026-10-02T01:30:00Z',
      hasSyncedData: true,
      sourceDetails: [
        {
          id: 'GoogleFit',
          label: 'GoogleFit',
          countsTowardBudget: true,
          note: 'Nguồn đang dùng cho hôm nay',
        },
      ],
      // BE không có danh sách hoạt động → UI ẩn khối "Hoạt động được tính".
      activities: [],
    });
  });

  test('chưa đồng bộ (sources rỗng, lastSyncedAt null) → chưa có dữ liệu, không hiện "vừa đồng bộ"', () => {
    const activity = fromDailySummaryDto(
      dto({
        steps: 0,
        burnedCalories: 0,
        distanceMeters: 0,
        sources: [],
        activeSource: null,
        lastSyncedAt: null,
      }),
    );

    expect(activity).toMatchObject({
      steps: 0,
      caloriesBurned: 0,
      sources: [],
      lastSyncedAt: null,
      hasSyncedData: false,
      sourceDetails: [],
      activities: [],
    });
  });

  test('đã đồng bộ nhưng 0 bước từ một nguồn thật vẫn là "đã đồng bộ"', () => {
    const activity = fromDailySummaryDto(dto({ steps: 0, burnedCalories: 0 }));

    expect(activity.hasSyncedData).toBe(true);
    expect(activity.lastSyncedAt).toBe('2026-10-02T01:30:00Z');
  });

  test('nhiều nguồn: chỉ nguồn ưu tiên cao nhất được cộng vào ngân sách, các nguồn còn lại bị bỏ qua (BR-042)', () => {
    const activity = fromDailySummaryDto(
      dto({ sources: ['HealthConnect', 'GoogleFit', 'Manual'], activeSource: 'HealthConnect' }),
    );

    expect(activity.sources).toEqual(['HealthConnect', 'GoogleFit', 'Manual']);
    expect(activity.sourceDetails.map(source => [source.id, source.countsTowardBudget])).toEqual([
      ['HealthConnect', true],
      ['GoogleFit', false],
      ['Manual', false],
    ]);
    expect(activity.sourceDetails[0].note).toBe('Nguồn đang dùng cho hôm nay');
    expect(activity.sourceDetails[1].note).toContain('không tính trùng');
  });

  test('thiếu activeSource (không nên xảy ra) → coi nguồn đầu tiên là nguồn đang dùng', () => {
    const activity = fromDailySummaryDto(
      dto({ sources: ['AppleHealth', 'Manual'], activeSource: null }),
    );

    expect(activity.sourceDetails.map(source => source.countsTowardBudget)).toEqual([true, false]);
  });
});

describe('healthSyncApiService', () => {
  test('GET /health-sync/daily-summary?date= với ngày giờ máy', async () => {
    const apiMock = { get: jest.fn().mockResolvedValue(dto()) };
    jest.resetModules();
    jest.doMock('@/services/api', () => ({
      api: apiMock,
      ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    }));
    const { healthSyncApiService } =
      require('@/features/nutrition/services/healthSyncService.api') as typeof import('@/features/nutrition/services/healthSyncService.api');

    const activity = await healthSyncApiService.getDailySummary?.('2026-10-02');

    expect(apiMock.get).toHaveBeenCalledWith('/health-sync/daily-summary', {
      params: { date: '2026-10-02' },
    });
    expect(activity).toMatchObject({ steps: 6240, caloriesBurned: 180, hasSyncedData: true });
  });
});

describe('healthSyncApiService.syncMetrics', () => {
  test('POST /health-sync/steps-and-calories với ngày giờ máy, đúng tên field của BE', async () => {
    const apiMock = { get: jest.fn(), post: jest.fn().mockResolvedValue({}) };
    jest.resetModules();
    jest.doMock('@/services/api', () => ({
      api: apiMock,
      ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    }));
    const { healthSyncApiService } =
      require('@/features/nutrition/services/healthSyncService.api') as typeof import('@/features/nutrition/services/healthSyncService.api');

    await healthSyncApiService.syncMetrics?.({
      dateIso: '2026-10-02',
      steps: 1200,
      burnedCalories: 55,
      distanceMeters: 900,
      source: 'GoogleFit',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/health-sync/steps-and-calories', {
      date: '2026-10-02',
      steps: 1200,
      burnedCalories: 55,
      distanceMeters: 900,
      source: 'GoogleFit',
    });
  });
});

describe('healthSyncMockService', () => {
  test('số liệu mẫu của design: 6.240 bước, 180 kcal, đồng bộ lúc 08:30 giờ máy', async () => {
    const { healthSyncMockService } =
      require('@/features/nutrition/services/healthSyncService.mock') as typeof import('@/features/nutrition/services/healthSyncService.mock');

    const activity = await healthSyncMockService.getDailySummary('2026-10-02');

    expect(activity).toMatchObject({
      dateIso: '2026-10-02',
      steps: 6240,
      caloriesBurned: 180,
      hasSyncedData: true,
    });
    // BR-042: nguồn thứ hai trùng khung giờ nên không được cộng lần hai.
    expect(activity.sourceDetails.map(source => [source.id, source.countsTowardBudget])).toEqual([
      ['health-connect', true],
      ['smart-watch', false],
    ]);
    expect(activity.activities).toHaveLength(2);
    const syncedAt = new Date(activity.lastSyncedAt ?? '');
    expect(syncedAt.getHours()).toBe(8);
    expect(syncedAt.getMinutes()).toBe(30);
  });
});
