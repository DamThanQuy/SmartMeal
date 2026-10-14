import { STORAGE_KEYS } from '@/constants/storage';
import { storageService } from '@/services/storage/storage';
import { getCurrentUserId } from '@/state/auth/authStore';
import { localNotificationService } from './localNotificationService';
import { buildDailyReminders, parseReminderPreferences, type ReminderPreferences } from './reminderSchedule';

// Phần lưu/đồng bộ nhắc nhở cục bộ, tách khỏi remindersService để sessionService gọi được khi mở/đóng
// phiên (lịch thông báo nằm ở cấp máy, phải đổi theo tài khoản đang đăng nhập).

function keyFor(): string {
  return `${STORAGE_KEYS.REMINDERS_PREFIX}${getCurrentUserId() ?? 'guest'}`;
}

export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  try {
    return parseReminderPreferences(await storageService.getString(keyFor()));
  } catch {
    return parseReminderPreferences(undefined);
  }
}

export async function saveReminderPreferences(preferences: ReminderPreferences): Promise<void> {
  await storageService.setString(keyFor(), JSON.stringify(preferences));
}

/** Lên lịch lại theo cài đặt của tài khoản hiện tại; chưa có quyền thông báo thì thôi. Không ném lỗi. */
export async function resyncReminders(): Promise<void> {
  try {
    if (!(await localNotificationService.isPermissionGranted())) return;
    await localNotificationService.replaceDailyReminders(buildDailyReminders(await loadReminderPreferences()));
  } catch {
    // Nhắc nhở là phụ: lỗi native không được chặn đăng nhập/đăng xuất.
  }
}

/** Đăng xuất: huỷ nhắc nhở của tài khoản vừa thoát. Không ném lỗi. */
export async function cancelReminders(): Promise<void> {
  try {
    await localNotificationService.replaceDailyReminders([]);
  } catch {
    // Như trên.
  }
}
