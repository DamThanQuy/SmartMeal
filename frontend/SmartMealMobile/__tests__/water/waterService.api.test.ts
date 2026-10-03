/**
 * waterService.api (docs/fetch-api/part1 §10): gọi đúng endpoint nước uống của BE — đọc 1 ngày /
 * 7 ngày, ghi, hoàn tác (xóa lần uống mới nhất), xóa. `api` được mock — không gọi mạng thật.
 */
import type { WaterHistoryDto } from '@/features/gamification/types/water.api.types';

function localIso(hour: number, minute: number): string {
  return new Date(2026, 9, 3, hour, minute).toISOString();
}

const DAY_HISTORY: WaterHistoryDto = {
  goalMl: 2000,
  days: [
    {
      date: '2026-10-03',
      totalMl: 750,
      entries: [
        { id: 'a', amountMl: 250, createdAt: localIso(7, 0) },
        { id: 'b', amountMl: 500, createdAt: localIso(9, 30) },
      ],
    },
  ],
};

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));

  const { waterApiService } =
    require('@/features/gamification/services/waterService.api') as typeof import('@/features/gamification/services/waterService.api');
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return { service: waterApiService, apiMock, ApiError };
}

describe('getDaySummary', () => {
  test('GET /nutritiondiary/water?date=&days=1 → tổng, mục tiêu của hồ sơ, các lần uống', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(DAY_HISTORY);

    const summary = await service.getDaySummary?.('2026-10-03');

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/water', {
      params: { date: '2026-10-03', days: 1 },
    });
    expect(summary).toEqual({
      dateIso: '2026-10-03',
      totalMl: 750,
      goalMl: 2000,
      entries: [
        { id: 'a', amountMl: 250, timeLabel: '07:00' },
        { id: 'b', amountMl: 500, timeLabel: '09:30' },
      ],
    });
  });

  test('lỗi → ném lỗi gốc (màn hình hiện ErrorState)', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Máy chủ gặp sự cố.', 'SERVER', 500);
    apiMock.get.mockRejectedValue(error);

    await expect(service.getDaySummary?.('2026-10-03')).rejects.toBe(error);
  });
});

describe('addEntry', () => {
  test('POST /nutritiondiary/water với lượng nước và ngày; trả lần uống mang id do BE cấp', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({
      entryId: 'new-1',
      date: '2026-10-03',
      totalWaterMl: 1000,
      goalWaterMl: 2000,
      percentage: 50,
    });

    const entry = await service.addEntry?.('2026-10-03', 250);

    expect(apiMock.post).toHaveBeenCalledWith('/nutritiondiary/water', {
      amountMl: 250,
      date: '2026-10-03',
    });
    expect(entry).toMatchObject({ id: 'new-1', amountMl: 250 });
    expect(entry?.timeLabel).toMatch(/^\d{2}:\d{2}$/);
  });

  test('BE từ chối (vd. quá 5000 ml) → ném lỗi của BE', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Lượng nước phải từ 1 đến 5000 ml.', 'BUSINESS', 400);
    apiMock.post.mockRejectedValue(error);

    await expect(service.addEntry?.('2026-10-03', 9000)).rejects.toBe(error);
  });
});

describe('undoLastEntry', () => {
  test('đọc các lần uống của ngày rồi DELETE lần mới nhất', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(DAY_HISTORY);
    apiMock.delete.mockResolvedValue({ totalWaterMl: 250 });

    await service.undoLastEntry?.('2026-10-03');

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/water', {
      params: { date: '2026-10-03', days: 1 },
    });
    expect(apiMock.delete).toHaveBeenCalledTimes(1);
    expect(apiMock.delete).toHaveBeenCalledWith('/nutritiondiary/water/b');
  });

  test('chưa có lần uống nào → không gọi DELETE', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue({ goalMl: 2000, days: [{ date: '2026-10-03', totalMl: 0, entries: [] }] });

    await service.undoLastEntry?.('2026-10-03');

    expect(apiMock.delete).not.toHaveBeenCalled();
  });
});

describe('deleteEntry', () => {
  test('DELETE /nutritiondiary/water/{id}', async () => {
    const { service, apiMock } = loadService();
    apiMock.delete.mockResolvedValue({ totalWaterMl: 0 });

    await service.deleteEntry?.('2026-10-03', 'a');

    expect(apiMock.delete).toHaveBeenCalledWith('/nutritiondiary/water/a');
  });

  test('lần uống không tồn tại → ném lỗi NOT_FOUND', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Không tìm thấy lần uống nước cần xóa.', 'NOT_FOUND', 404);
    apiMock.delete.mockRejectedValue(error);

    await expect(service.deleteEntry?.('2026-10-03', 'x')).rejects.toBe(error);
  });
});

describe('getWeekSummary', () => {
  test('GET /nutritiondiary/water?date=&days=7, "Đạt n/7 ngày" theo mục tiêu của hồ sơ', async () => {
    const { service, apiMock } = loadService();
    const dates = [
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ];
    const totals = [2000, 0, 2500, 1500, 0, 2000, 750];
    apiMock.get.mockResolvedValue({
      goalMl: 2000,
      days: dates.map((date, index) => ({ date, totalMl: totals[index], entries: [] })),
    });

    const week = await service.getWeekSummary?.('2026-10-03');

    expect(apiMock.get).toHaveBeenCalledWith('/nutritiondiary/water', {
      params: { date: '2026-10-03', days: 7 },
    });
    expect(week?.days).toHaveLength(7);
    expect(week?.days[6]).toMatchObject({ dateIso: '2026-10-03', totalMl: 750, isToday: true });
    expect(week?.daysOnTarget).toBe(3);
  });
});
