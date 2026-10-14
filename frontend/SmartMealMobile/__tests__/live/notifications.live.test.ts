/**
 * Live: thông báo trong app với backend thật — tài khoản mới không có thông báo; ghi bữa đầu tiên thì server tạo
 * đúng một thông báo huy hiệu; tạo danh sách đi chợ có thông báo; đánh dấu đã đọc từng cái và tất cả.
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type NotificationsModule = typeof import('@/features/profile/services/notificationsService');
type NutritionModule = typeof import('@/features/nutrition/services/nutritionService');
type StoreModule = typeof import('@/state/auth/authStore');

describeLive('thông báo (backend thật)', () => {
  let authService: AuthModule['authService'];
  let notificationsService: NotificationsModule['notificationsService'];
  let nutritionService: NutritionModule['nutritionService'];
  let todayIso: NutritionModule['todayIso'];
  let useAuthStore: StoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ notificationsService } = require('@/features/profile/services/notificationsService') as NotificationsModule);
    ({ nutritionService, todayIso } = require('@/features/nutrition/services/nutritionService') as NutritionModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
  });

  async function newUser() {
    const { user } = await authService.register({ fullName: 'Người Thử', email: uniqueEmail('notif'), password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: null, user, isAuthenticated: true });
  }

  test('tài khoản mới không có thông báo nào (không có thông báo mẫu)', async () => {
    await newUser();

    expect(await notificationsService.getNotifications()).toEqual({ items: [], unreadCount: 0 });
  });

  test('ghi bữa đầu tiên → đúng một thông báo huy hiệu, mở lại không nhân đôi; đọc từng cái rồi đọc hết', async () => {
    await newUser();
    await nutritionService.addLogEntries(todayIso(), 'lunch', [
      {
        foodName: 'Cơm gà',
        servingLabel: '1 đĩa',
        grams: 300,
        nutrition: { calories: 550, proteinG: 30, carbsG: 70, fatG: 15 },
        source: 'manual',
      },
    ]);

    const first = await notificationsService.getNotifications();
    const again = await notificationsService.getNotifications();

    const badge = first.items.find(item => item.icon === 'badge');
    expect(badge).toMatchObject({ title: 'Mở khóa huy hiệu: Khởi đầu', read: false, section: 'today' });
    expect(again.items.filter(item => item.icon === 'badge')).toHaveLength(1);
    expect(first.unreadCount).toBeGreaterThanOrEqual(1);

    await notificationsService.markRead(badge!.id);
    const afterOne = await notificationsService.getNotifications();
    expect(afterOne.items.find(item => item.id === badge!.id)?.read).toBe(true);
    expect(afterOne.unreadCount).toBe(first.unreadCount - 1);

    await notificationsService.markAllRead();
    const afterAll = await notificationsService.getNotifications();
    expect(afterAll.unreadCount).toBe(0);
    expect(afterAll.items.every(item => item.read)).toBe(true);
  });
});
