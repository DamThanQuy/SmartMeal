import {
  buildDailyReminders,
  DEFAULT_REMINDER_PREFERENCES,
  parseReminderPreferences,
  REMINDER_ID_PREFIX,
} from '@/features/profile/services/reminderSchedule';

describe('reminderSchedule', () => {
  test('mặc định: sáng/trưa/tối + 7 lần uống nước + chuỗi ngày; bữa phụ và thử thách không lên lịch', () => {
    const reminders = buildDailyReminders(DEFAULT_REMINDER_PREFERENCES);
    const ids = reminders.map(item => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        `${REMINDER_ID_PREFIX}meal-breakfast`,
        `${REMINDER_ID_PREFIX}meal-lunch`,
        `${REMINDER_ID_PREFIX}meal-dinner`,
        `${REMINDER_ID_PREFIX}streak`,
      ]),
    );
    expect(ids).not.toContain(`${REMINDER_ID_PREFIX}meal-snack`);
    expect(ids.filter(id => id.includes('water'))).toHaveLength(7);
    expect(reminders).toHaveLength(3 + 7 + 1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(reminders.find(item => item.id.endsWith('meal-dinner'))).toMatchObject({ hour: 18, minute: 30 });
  });

  test('tắt hết → không có nhắc nào', () => {
    expect(
      buildDailyReminders({
        meals: { breakfast: false, lunch: false, dinner: false, snack: false },
        water: false,
        other: { streak: false, challenge: true },
      }),
    ).toEqual([]);
  });

  test('dữ liệu lưu hỏng hoặc thiếu field → giữ mặc định cho phần thiếu', () => {
    expect(parseReminderPreferences('không phải json')).toEqual(DEFAULT_REMINDER_PREFERENCES);
    expect(parseReminderPreferences(JSON.stringify({ meals: { snack: true }, water: 'có' }))).toEqual({
      ...DEFAULT_REMINDER_PREFERENCES,
      meals: { ...DEFAULT_REMINDER_PREFERENCES.meals, snack: true },
    });
  });
});

describe('remindersService', () => {
  function load(permission: { granted: boolean; afterRequest?: boolean }) {
    jest.resetModules();
    const store = new Map<string, string>();
    const notifications = {
      isPermissionGranted: jest.fn(async () => permission.granted),
      requestPermission: jest.fn(async () => permission.afterRequest ?? permission.granted),
      replaceDailyReminders: jest.fn(async (_reminders: { id: string }[]) => {}),
    };
    jest.doMock('@/features/profile/services/localNotificationService', () => ({
      localNotificationService: notifications,
    }));
    jest.doMock('@/services/storage/storage', () => ({
      storageService: {
        getString: jest.fn(async (key: string) => store.get(key)),
        setString: jest.fn(async (key: string, value: string) => void store.set(key, value)),
      },
    }));
    const { remindersService } =
      require('@/features/profile/services/remindersService') as typeof import('@/features/profile/services/remindersService');
    return { remindersService, notifications };
  }

  test('banner theo quyền thông báo thật; nhãn giờ theo cài đặt', async () => {
    const { remindersService } = load({ granted: false });

    const settings = await remindersService.getReminders();

    expect(settings.systemNotificationsEnabled).toBe(false);
    expect(settings.meals.find(meal => meal.mealType === 'breakfast')).toMatchObject({
      enabled: true,
      timeLabel: '07:00 hằng ngày',
    });
    expect(settings.meals.find(meal => meal.mealType === 'snack')).toMatchObject({ enabled: false, timeLabel: 'Tắt' });
  });

  test('bật nhắc bữa phụ: lưu lại, xin quyền, lên lịch lại có bữa phụ', async () => {
    const { remindersService, notifications } = load({ granted: false, afterRequest: true });

    await remindersService.toggleMealReminder('snack');

    expect(notifications.requestPermission).toHaveBeenCalledTimes(1);
    const scheduled = notifications.replaceDailyReminders.mock.calls[0][0];
    expect(scheduled.map(item => item.id)).toContain(`${REMINDER_ID_PREFIX}meal-snack`);
    expect((await remindersService.getReminders()).meals.find(meal => meal.mealType === 'snack')?.enabled).toBe(true);
  });

  test('tắt nhắc nước khi chưa có quyền: chỉ lưu, không xin quyền, không lên lịch', async () => {
    const { remindersService, notifications } = load({ granted: false });

    await remindersService.toggleWaterReminder();

    expect(notifications.requestPermission).not.toHaveBeenCalled();
    expect(notifications.replaceDailyReminders).not.toHaveBeenCalled();
    expect((await remindersService.getReminders()).water.enabled).toBe(false);
  });

  test('người dùng từ chối quyền: cài đặt vẫn lưu nhưng không lên lịch', async () => {
    const { remindersService, notifications } = load({ granted: false, afterRequest: false });

    await remindersService.toggleMealReminder('snack');

    expect(notifications.replaceDailyReminders).not.toHaveBeenCalled();
    expect((await remindersService.getReminders()).meals.find(meal => meal.mealType === 'snack')?.enabled).toBe(true);
  });
});
