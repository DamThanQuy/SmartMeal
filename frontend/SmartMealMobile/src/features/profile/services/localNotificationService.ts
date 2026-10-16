import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { REMINDER_ID_PREFIX, type DailyReminder } from './reminderSchedule';

// Expo Go SDK 53+ không hỗ trợ remote push trên Android. Bỏ qua native notifications trong Expo Go
// để các luồng còn lại của app vẫn chạy; development build/production build vẫn dùng local reminders.

const ANDROID_CHANNEL_ID = 'reminders';
/** Kênh Android của thông báo sự kiện từ server (huy hiệu, thử thách, gói Pro...) — hiện banner như app khác. */
const EVENTS_CHANNEL_ID = 'events';

let handlerInstalled = false;
type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) return null;
  if (notificationsModule) return notificationsModule;
  notificationsModule = await import('expo-notifications');
  return notificationsModule;
}

async function ensureForegroundHandler(): Promise<NotificationsModule | null> {
  const notifications = await getNotifications();
  if (!notifications || handlerInstalled) return notifications;
  handlerInstalled = true;
  // Đang mở app vẫn hiện nhắc nhở.
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  return notifications;
}

export interface PresentedNotification {
  title: string;
  body: string;
  /** Gắn vào thông báo, nhận lại khi người dùng bấm (addTapListener). */
  data: Record<string, string>;
}

export const localNotificationService = {
  async isPermissionGranted(): Promise<boolean> {
    const notifications = await getNotifications();
    if (!notifications) return false;
    const { granted } = await notifications.getPermissionsAsync();
    return granted;
  },

  /** Hỏi quyền (chỉ hiện hộp thoại hệ thống khi còn hỏi được). Trả về đã có quyền hay chưa. */
  async requestPermission(): Promise<boolean> {
    const notifications = await getNotifications();
    if (!notifications) return false;
    const current = await notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return current.granted;
    return (await notifications.requestPermissionsAsync()).granted;
  },

  /**
   * Hiện ngay một thông báo hệ thống (thanh thông báo của máy). Không tự hỏi quyền — chưa cấp, đang chạy Expo Go hay web
   * thì bỏ qua (app vẫn có thông báo trong app và chấm đỏ ở chuông).
   */
  async presentNow({ title, body, data }: PresentedNotification): Promise<void> {
    if (Platform.OS === 'web') return;
    const notifications = await ensureForegroundHandler();
    if (!notifications || !(await notifications.getPermissionsAsync()).granted) return;
    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync(EVENTS_CHANNEL_ID, {
        name: 'Thông báo',
        importance: notifications.AndroidImportance.HIGH,
      });
    }
    await notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: Platform.OS === 'android' ? { channelId: EVENTS_CHANNEL_ID } : null,
    });
  },

  /** Người dùng bấm vào một thông báo hệ thống của app: nhận lại `data` đã gắn. Trả hàm hủy. */
  async addTapListener(onTap: (data: Record<string, unknown>) => void): Promise<() => void> {
    if (Platform.OS === 'web') return () => {};
    const notifications = await getNotifications();
    if (!notifications) return () => {};
    const subscription = notifications.addNotificationResponseReceivedListener(response =>
      onTap(response.notification.request.content.data ?? {}),
    );
    return () => subscription.remove();
  },

  /** Thay toàn bộ nhắc nhở SmartMeal đã lên lịch bằng danh sách mới (thông báo của app khác giữ nguyên). */
  async replaceDailyReminders(reminders: DailyReminder[]): Promise<void> {
    const notifications = await ensureForegroundHandler();
    if (!notifications) return;
    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Nhắc nhở',
        importance: notifications.AndroidImportance.DEFAULT,
      });
    }
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(item => item.identifier.startsWith(REMINDER_ID_PREFIX))
        .map(item => notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    for (const reminder of reminders) {
      await notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  },
};
