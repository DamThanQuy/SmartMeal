/**
 * healthSync (docs/fetch-api/part1 §8): số liệu vận động 1 ngày. Ngày chưa có log nào BE vẫn trả
 * `sources: ["Manual"]` và `lastSyncedAt = bây giờ` → phải coi là "chưa đồng bộ".
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
    });
  });

  test('chưa có log nào (placeholder "Manual", 0 bước, giờ = bây giờ) → chưa đồng bộ', () => {
    const activity = fromDailySummaryDto(
      dto({
        steps: 0,
        burnedCalories: 0,
        distanceMeters: 0,
        sources: ['Manual'],
        lastSyncedAt: '2026-10-02T09:00:00Z',
      }),
    );

    expect(activity).toMatchObject({
      steps: 0,
      caloriesBurned: 0,
      sources: [],
      lastSyncedAt: null,
      hasSyncedData: false,
    });
  });

  test('đã đồng bộ nhưng 0 bước từ một nguồn thật vẫn là "đã đồng bộ"', () => {
    const activity = fromDailySummaryDto(
      dto({ steps: 0, burnedCalories: 0, sources: ['GoogleFit'] }),
    );

    expect(activity.hasSyncedData).toBe(true);
    expect(activity.lastSyncedAt).toBe('2026-10-02T01:30:00Z');
  });

  test('nhập tay có số liệu (nguồn "Manual" nhưng có bước/calo) → đã có dữ liệu', () => {
    const activity = fromDailySummaryDto(dto({ sources: ['Manual'], steps: 3000 }));

    expect(activity.hasSyncedData).toBe(true);
    expect(activity.sources).toEqual(['Manual']);
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
    const syncedAt = new Date(activity.lastSyncedAt ?? '');
    expect(syncedAt.getHours()).toBe(8);
    expect(syncedAt.getMinutes()).toBe(30);
  });
});
