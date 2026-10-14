import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { REMINDER_ID_PREFIX, type DailyReminder } from './reminderSchedule';

// Native service cho thông báo CỤC BỘ (expo-notifications — chạy được trên Expo Go; push từ server thì
// không). Chỉ đụng tới các thông báo có tiền tố của SmartMeal.

const ANDROID_CHANNEL_ID = 'reminders';

let handlerInstalled = false;

function ensureForegroundHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  // Đang mở app vẫn hiện nhắc nhở.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const localNotificationService = {
  async isPermissionGranted(): Promise<boolean> {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  },

  /** Hỏi quyền (chỉ hiện hộp thoại hệ thống khi còn hỏi được). Trả về đã có quyền hay chưa. */
  async requestPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return current.granted;
    return (await Notifications.requestPermissionsAsync()).granted;
  },

  /** Thay toàn bộ nhắc nhở SmartMeal đã lên lịch bằng danh sách mới (thông báo của app khác giữ nguyên). */
  async replaceDailyReminders(reminders: DailyReminder[]): Promise<void> {
    ensureForegroundHandler();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Nhắc nhở',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(item => item.identifier.startsWith(REMINDER_ID_PREFIX))
        .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    for (const reminder of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  },
};
