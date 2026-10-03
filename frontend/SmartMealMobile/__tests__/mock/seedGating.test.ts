/**
 * Dữ liệu mẫu của design (nước uống, thông báo) chỉ được dùng khi chạy mock. Gọi API thật thì
 * người dùng mới không được thấy số liệu giả của người khác (docs/fetch-api/part1 §14.4).
 */

function loadWaterService(useMockApi: boolean) {
  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  jest.doMock('@/config/mock', () => ({ getMockDelayMs: () => 0, wait: async () => undefined }));
  jest.doMock('@/state/app/appStore', () => ({ getCurrentMockScenario: () => 'success' }));
  jest.doMock('@/state/resetUserData', () => ({ registerUserDataReset: jest.fn() }));
  jest.doMock('@/state/user/userProfileStore', () => ({ getWaterGoalMl: () => 2000 }));
  jest.doMock('@/features/nutrition', () => ({ todayIso: () => '2026-10-02' }));
  const { waterService } =
    require('@/features/gamification/services/waterService') as typeof import('@/features/gamification/services/waterService');
  return waterService;
}

function loadNotificationsService(useMockApi: boolean) {
  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  jest.doMock('@/config/mock', () => ({ getMockDelayMs: () => 0, wait: async () => undefined }));
  jest.doMock('@/state/app/appStore', () => ({ getCurrentMockScenario: () => 'success' }));
  const { notificationsService } =
    require('@/features/profile/services/notificationsService') as typeof import('@/features/profile/services/notificationsService');
  return notificationsService;
}

describe('waterService', () => {
  test('chạy mock → 5 ly mẫu hôm nay và lịch sử 7 ngày của design', async () => {
    const water = loadWaterService(true);

    const day = await water.getDaySummary('2026-10-02');
    const week = await water.getWeekSummary('2026-10-02');

    expect(day.entries).toHaveLength(5);
    expect(day.totalMl).toBe(1250);
    expect(week.days).toHaveLength(7);
    expect(week.days.slice(0, 6).map(item => item.totalMl)).toEqual([2000, 1500, 2000, 1200, 1750, 2000]);
    expect(week.daysOnTarget).toBe(3);
  });

  test('gọi API thật → người dùng mới bắt đầu từ 0, không có lịch sử giả', async () => {
    const water = loadWaterService(false);

    const day = await water.getDaySummary('2026-10-02');
    const week = await water.getWeekSummary('2026-10-02');

    expect(day.entries).toEqual([]);
    expect(day.totalMl).toBe(0);
    expect(week.days.map(item => item.totalMl)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(week.daysOnTarget).toBe(0);
  });

  test('gọi API thật → vẫn ghi được nước cục bộ, bắt đầu cộng từ 0', async () => {
    const water = loadWaterService(false);

    await water.addEntry('2026-10-02', 250);

    expect((await water.getDaySummary('2026-10-02')).totalMl).toBe(250);
  });
});

describe('notificationsService', () => {
  test('chạy mock → danh sách thông báo mẫu của design', async () => {
    const service = loadNotificationsService(true);

    const notifications = await service.getNotifications();

    expect(notifications.length).toBeGreaterThan(0);
  });

  test('gọi API thật → rỗng (backend không có thông báo), đánh dấu đã đọc không lỗi', async () => {
    const service = loadNotificationsService(false);

    expect(await service.getNotifications()).toEqual([]);
    await expect(service.markAllRead()).resolves.toBeUndefined();
  });
});
