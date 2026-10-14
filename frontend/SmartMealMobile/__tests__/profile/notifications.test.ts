import { fromNotificationDto, notificationTimeLabel } from '@/features/profile/services/notifications.mapper';
import type { NotificationApiDto } from '@/features/profile/types/notifications.api.types';

const NOW = new Date(2026, 9, 14, 20, 0);

function dto(overrides: Partial<NotificationApiDto> = {}): NotificationApiDto {
  return {
    id: 'n-1',
    category: 'badge',
    title: 'Mở khóa huy hiệu: Khởi đầu',
    body: 'Ghi bữa đầu tiên',
    createdAt: new Date(2026, 9, 14, 8, 5).toISOString(),
    isRead: false,
    ...overrides,
  };
}

describe('notifications.mapper', () => {
  test('nhãn thời gian theo giờ máy: hôm nay HH:mm, hôm qua, ngày trước dd/MM, năm khác dd/MM/yyyy', () => {
    expect(notificationTimeLabel(new Date(2026, 9, 14, 8, 5), NOW)).toEqual({ timeLabel: '08:05', section: 'today' });
    expect(notificationTimeLabel(new Date(2026, 9, 13, 23, 59), NOW)).toEqual({ timeLabel: 'Hôm qua', section: 'earlier' });
    expect(notificationTimeLabel(new Date(2026, 9, 2, 9, 0), NOW)).toEqual({ timeLabel: '02/10', section: 'earlier' });
    expect(notificationTimeLabel(new Date(2025, 11, 31, 9, 0), NOW)).toEqual({ timeLabel: '31/12/2025', section: 'earlier' });
  });

  test('nhóm của server → biểu tượng; nhóm lạ vẫn hiện với biểu tượng chung', () => {
    expect(fromNotificationDto(dto(), NOW)).toMatchObject({
      id: 'n-1',
      icon: 'badge',
      description: 'Ghi bữa đầu tiên',
      read: false,
      section: 'today',
      timeLabel: '08:05',
    });
    expect(fromNotificationDto(dto({ category: 'premium' }), NOW).icon).toBe('premium');
    expect(fromNotificationDto(dto({ category: 'something-new' }), NOW).icon).toBe('general');
  });

  test('thời điểm BE thiếu hậu tố múi giờ vẫn hiểu là UTC', () => {
    const utc = '2026-10-14T01:05:00';
    const item = fromNotificationDto(dto({ createdAt: utc }), NOW);
    expect(item.createdAtIso).toBe(utc);
    expect(item.timeLabel).toBe(notificationTimeLabel(new Date(`${utc}Z`), NOW).timeLabel);
  });
});

describe('notificationsService.api', () => {
  function load() {
    const apiMock = { get: jest.fn(), patch: jest.fn().mockResolvedValue({}), post: jest.fn().mockResolvedValue({ updated: 2 }) };
    jest.resetModules();
    jest.doMock('@/services/api', () => ({
      api: apiMock,
      ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    }));
    const { notificationsApiService } =
      require('@/features/profile/services/notificationsService.api') as typeof import('@/features/profile/services/notificationsService.api');
    return { service: notificationsApiService, apiMock };
  }

  test('GET /notifications kèm ngày theo máy; trả danh sách đã quy đổi và số chưa đọc', async () => {
    const { service, apiMock } = load();
    apiMock.get.mockResolvedValue({ items: [dto()], unreadCount: 1 });

    const result = await service.getNotifications?.();

    expect(apiMock.get).toHaveBeenCalledWith('/notifications', { params: { date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } });
    expect(result?.unreadCount).toBe(1);
    expect(result?.items[0]).toMatchObject({ id: 'n-1', icon: 'badge' });
  });

  test('đánh dấu một thông báo / tất cả đã đọc gọi đúng endpoint', async () => {
    const { service, apiMock } = load();

    await service.markRead?.('n-1');
    await service.markAllRead?.();

    expect(apiMock.patch).toHaveBeenCalledWith('/notifications/n-1/read');
    expect(apiMock.post).toHaveBeenCalledWith('/notifications/read-all');
  });
});
