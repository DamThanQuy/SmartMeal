/**
 * Thông báo real-time ở app: payload từ hub → NotificationItem; thông báo mới vào ngay danh sách + chấm đỏ (không trùng),
 * làm mới dữ liệu liên quan (gói Pro → mở khóa ngay); chỉ nghe khi đã đăng nhập; bấm thông báo mở đúng màn.
 */
import { NOTIFICATIONS_QUERY_KEY } from '@/features/profile/hooks/useNotifications';
import { useRealtimeNotifications } from '@/features/profile/hooks/useRealtimeNotifications';
import type { NotificationApiDto } from '@/features/profile/types/notifications.api.types';
import type { NotificationItem, NotificationsResult } from '@/features/profile/types/profile.types';
import { useAuthStore } from '@/state/auth/authStore';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { renderHookWithQuery } from '../../test-utils/renderHookWithQuery';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockGetStatus = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/profile/services/notificationsRealtime', () => ({
  subscribeToNotifications: (handlers: unknown) => {
    mockSubscribe(handlers);
    return mockUnsubscribe;
  },
}));
jest.mock('@/features/premium', () => ({ premiumService: { getStatus: () => mockGetStatus() } }));

function dto(overrides: Partial<NotificationApiDto> = {}): NotificationApiDto {
  return {
    id: 'n-new',
    category: 'badge',
    title: 'Mở khóa huy hiệu: Khởi đầu',
    body: 'Ghi bữa đầu tiên',
    createdAt: new Date().toISOString(),
    isRead: false,
    ...overrides,
  };
}

describe('subscribeToNotifications', () => {
  test('payload hợp lệ → NotificationItem + nhóm; payload lạ bị bỏ qua', () => {
    jest.resetModules();
    const mockOpen = jest.fn<() => void, [{ path: string; handlers: Record<string, (payload: unknown) => void> }]>(
      () => () => {},
    );
    jest.doMock('@/services/realtime/realtimeConnection', () => ({ openRealtimeConnection: mockOpen }));
    const { subscribeToNotifications } = jest.requireActual<
      typeof import('@/features/profile/services/notificationsRealtime')
    >('@/features/profile/services/notificationsRealtime');
    const onNotification = jest.fn();

    subscribeToNotifications({ onNotification, onConnected: jest.fn() });
    const { path, handlers } = mockOpen.mock.calls[0][0];
    handlers.notification(dto({ category: 'premium' }));
    handlers.notification({ id: 1, title: 'thiếu trường' });
    handlers.notification(null);

    expect(path).toBe('/hubs/notifications');
    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-new', icon: 'premium', read: false, section: 'today' }),
      'premium',
    );
  });
});

describe('useRealtimeNotifications', () => {
  type Handlers = { onNotification: (item: NotificationItem, category: string) => void; onConnected: () => void };
  const lastHandlers = (): Handlers => mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1][0] as Handlers;

  function item(id: string, read = false): NotificationItem {
    return { id, title: id, description: '', timeLabel: '08:00', read, icon: 'badge', section: 'today' };
  }

  function signIn() {
    useAuthStore.setState({ isAuthenticated: true, isGuest: false, sessionExpired: false });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatus.mockResolvedValue({ status: 'premium', planId: 'PRO_MONTHLY', expiresAtIso: '2026-11-16T00:00:00Z' });
  });

  test('chưa đăng nhập (Guest) → không mở kết nối', async () => {
    useAuthStore.setState({ isAuthenticated: false, isGuest: true, sessionExpired: false });

    const hook = await renderHookWithQuery(() => useRealtimeNotifications(jest.fn()));

    expect(mockSubscribe).not.toHaveBeenCalled();
    await hook.unmount();
  });

  test('thông báo mới → đầu danh sách, +1 chưa đọc, báo ra ngoài; nhận lại cùng id không thêm lần nữa', async () => {
    signIn();
    const onNotification = jest.fn();
    const hook = await renderHookWithQuery(() => useRealtimeNotifications(onNotification));
    hook.queryClient.setQueryData<NotificationsResult>(NOTIFICATIONS_QUERY_KEY, {
      items: [item('n-old', true)],
      unreadCount: 0,
    });

    await hook.run(async () => lastHandlers().onNotification(item('n-new'), 'badge'));
    await hook.run(async () => lastHandlers().onNotification(item('n-new'), 'badge'));

    const list = hook.queryClient.getQueryData<NotificationsResult>(NOTIFICATIONS_QUERY_KEY);
    expect(list?.items.map(i => i.id)).toEqual(['n-new', 'n-old']);
    expect(list?.unreadCount).toBe(1);
    expect(onNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-new' }));
    await hook.unmount();
  });

  test('gói Pro vừa kích hoạt → nạp lại gói vào premiumStore để mở khóa ngay', async () => {
    signIn();
    usePremiumStore.getState().resetToFree();
    const hook = await renderHookWithQuery(() => useRealtimeNotifications(jest.fn()));

    await hook.run(async () => lastHandlers().onNotification(item('n-pro'), 'premium'));

    expect(mockGetStatus).toHaveBeenCalledTimes(1);
    expect(usePremiumStore.getState().status).toBe('premium');
    await hook.unmount();
  });

  test('kết nối xong → đọc lại danh sách; hết phiên → ngắt kết nối', async () => {
    signIn();
    const hook = await renderHookWithQuery(() => useRealtimeNotifications(jest.fn()));
    hook.queryClient.setQueryData<NotificationsResult>(NOTIFICATIONS_QUERY_KEY, { items: [], unreadCount: 0 });

    await hook.run(async () => lastHandlers().onConnected());
    expect(hook.queryClient.getQueryState(NOTIFICATIONS_QUERY_KEY)?.isInvalidated).toBe(true);

    await hook.run(async () => useAuthStore.setState({ sessionExpired: true }));
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
});

describe('notificationTarget', () => {
  function load() {
    jest.resetModules();
    jest.doMock('@/features/meal-planner', () => ({ currentWeekStartIso: () => '2026-10-12' }));
    return jest.requireActual<typeof import('@/features/profile/services/notificationTarget')>(
      '@/features/profile/services/notificationTarget',
    );
  }

  test('mỗi nhóm mở đúng màn; đi chợ là route lồng trong tab Thực đơn; nhóm chung không có màn', () => {
    const { notificationTarget } = load();

    expect(notificationTarget('badge')).toEqual({ screen: 'Badges' });
    expect(notificationTarget('premium')).toEqual({ screen: 'Subscription' });
    expect(notificationTarget('grocery')).toEqual({
      screen: 'MainTabs',
      params: { screen: 'Planner', params: { screen: 'Grocery', params: { weekStartIso: '2026-10-12' } } },
    });
    expect(notificationTarget('general')).toBeNull();
  });

  test('chỉ nhận biểu tượng hợp lệ đọc lại từ data của thông báo hệ thống', () => {
    const { isNotificationIcon } = load();

    expect(isNotificationIcon('challenge')).toBe(true);
    expect(isNotificationIcon('toString')).toBe(false);
    expect(isNotificationIcon(undefined)).toBe(false);
  });
});
