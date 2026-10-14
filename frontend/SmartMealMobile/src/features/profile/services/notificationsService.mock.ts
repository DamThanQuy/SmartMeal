import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { NOTIFICATIONS_MOCK } from '../mocks/notifications.mock';
import type { NotificationItem, NotificationsResult } from '../types/profile.types';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API) — danh sách mẫu của design/Notifications.dc.html, cùng chữ ký với
// notificationsService.api.ts.
let notifications: NotificationItem[] = NOTIFICATIONS_MOCK.map(item => ({ ...item }));

async function simulate(errorMessage: string): Promise<'success' | 'empty'> {
  const scenario = getCurrentMockScenario();
  await wait(getMockDelayMs(scenario));
  if (scenario === 'error') throw new Error(errorMessage);
  return scenario === 'empty' ? 'empty' : 'success';
}

export const notificationsMockService = {
  async getNotifications(): Promise<NotificationsResult> {
    if ((await simulate('Không thể tải thông báo, vui lòng thử lại.')) === 'empty') {
      return { items: [], unreadCount: 0 };
    }
    return {
      items: notifications.map(item => ({ ...item })),
      unreadCount: notifications.filter(item => !item.read).length,
    };
  },

  async markRead(notificationId: string): Promise<void> {
    await simulate('Không thể cập nhật, vui lòng thử lại.');
    notifications = notifications.map(item => (item.id === notificationId ? { ...item, read: true } : item));
  },

  async markAllRead(): Promise<void> {
    await simulate('Không thể cập nhật, vui lòng thử lại.');
    notifications = notifications.map(item => ({ ...item, read: true }));
  },
};
