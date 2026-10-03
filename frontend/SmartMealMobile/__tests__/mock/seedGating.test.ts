/**
 * Dữ liệu mẫu của design (nước uống, thông báo) chỉ được dùng khi chạy mock. Gọi API thật thì
 * người dùng mới không được thấy số liệu giả của người khác (docs/fetch-api/part1 §14.4).
 */

// waterService là bộ chọn mock/API (selectService): cờ useMockApi quyết định bản nào chạy.
function loadWaterService(useMockApi: boolean) {
  const apiMock = {
    get: jest.fn().mockResolvedValue({
      goalMl: 2000,
      days: [{ date: '2026-10-02', totalMl: 0, entries: [] }],
    }),
    post: jest.fn(),
    delete: jest.fn(),
  };
  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  jest.doMock('@/config/mock', () => ({ getMockDelayMs: () => 0, wait: async () => undefined }));
  jest.doMock('@/state/app/appStore', () => ({ getCurrentMockScenario: () => 'success' }));
  jest.doMock('@/state/resetUserData', () => ({ registerUserDataReset: jest.fn() }));
  jest.doMock('@/state/user/userProfileStore', () => ({ getWaterGoalMl: () => 2000 }));
  jest.doMock('@/services/api', () => ({
    selectService: jest.requireActual('@/services/api/serviceSelector').selectService,
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  const { waterService } =
    require('@/features/gamification/services/waterService') as typeof import('@/features/gamification/services/waterService');
  return { waterService, apiMock };
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
  // Bản mock gieo dữ liệu cho "hôm nay" theo giờ máy.
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 2, 12) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('chạy mock → 5 ly mẫu hôm nay và lịch sử 7 ngày của design, không gọi API', async () => {
    const { waterService, apiMock } = loadWaterService(true);

    const day = await waterService.getDaySummary('2026-10-02');
    const week = await waterService.getWeekSummary('2026-10-02');

    expect(day.entries).toHaveLength(5);
    expect(day.totalMl).toBe(1250);
    expect(week.days).toHaveLength(7);
    expect(week.days.slice(0, 6).map(item => item.totalMl)).toEqual([2000, 1500, 2000, 1200, 1750, 2000]);
    expect(week.daysOnTarget).toBe(3);
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  test('gọi API thật → đọc từ server, người dùng mới bắt đầu từ 0, không có số liệu giả của design', async () => {
    const { waterService, apiMock } = loadWaterService(false);

    const day = await waterService.getDaySummary('2026-10-02');

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(day.entries).toEqual([]);
    expect(day.totalMl).toBe(0);
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
