import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { NOTIFICATIONS_MOCK } from '../mocks/notifications.mock';
import type { NotificationItem } from '../types/profile.types';

// TODO: replace mock with real API.
let notifications: NotificationItem[] = NOTIFICATIONS_MOCK.map(item => ({ ...item }));

export const notificationsService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải thông báo, vui lòng thử lại.');
    }
    if (scenario === 'empty') return [];
    return notifications.map(item => ({ ...item }));
  },

  async markAllRead(): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }
    notifications = notifications.map(item => ({ ...item, read: true }));
  },
};
