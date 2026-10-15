import { CUP_ML } from '@/features/gamification';
import { getWaterGoalMl } from '@/state/user/userProfileStore';
import type { MealType } from '@/types/meal.types';
import type { OtherReminderId, RemindersSettings } from '../types/profile.types';
import { localNotificationService } from './localNotificationService';
import {
  buildDailyReminders,
  formatClock,
  MEAL_REMINDER_TIMES,
  STREAK_REMINDER_TIME,
  WATER_REMINDER_HOURS,
  type ReminderPreferences,
} from './reminderSchedule';
import { loadReminderPreferences as loadPreferences, resyncReminders, saveReminderPreferences } from './reminderSync';

// design/Reminders.dc.html. Nhắc nhở là tính năng CỤC BỘ: cài đặt lưu ở máy (AsyncStorage, theo từng
// user), thông báo lên lịch bằng expo-notifications trong development/production build. Expo Go SDK 53+
// không hỗ trợ remote push trên Android nên localNotificationService sẽ báo chưa cấp quyền ở Expo Go.

function toSettings(preferences: ReminderPreferences, permissionGranted: boolean): RemindersSettings {
  const cupsPerDay = Math.round(getWaterGoalMl() / CUP_ML);
  const firstWater = formatClock({ hour: WATER_REMINDER_HOURS[0], minute: 0 });
  const lastWater = formatClock({ hour: WATER_REMINDER_HOURS[WATER_REMINDER_HOURS.length - 1], minute: 0 });
  return {
    systemNotificationsEnabled: permissionGranted,
    meals: (Object.keys(MEAL_REMINDER_TIMES) as MealType[]).map(mealType => ({
      mealType,
      enabled: preferences.meals[mealType],
      timeLabel: preferences.meals[mealType] ? `${formatClock(MEAL_REMINDER_TIMES[mealType])} hằng ngày` : 'Tắt',
    })),
    water: {
      enabled: preferences.water,
      summaryLabel: `Mỗi 2 giờ · ${firstWater}–${lastWater} · ${cupsPerDay} ly/ngày`,
    },
    other: [
      {
        id: 'streak',
        label: 'Nhắc giữ chuỗi ngày',
        description: `${formatClock(STREAK_REMINDER_TIME)} hằng ngày`,
        enabled: preferences.other.streak,
      },
      {
        id: 'challenge',
        label: 'Thử thách & phần thưởng',
        description: 'Hiện trong ứng dụng khi có cập nhật',
        enabled: preferences.other.challenge,
      },
    ],
  };
}

/** Lưu cài đặt rồi lên lịch lại. Bật một nhắc nhở thì xin quyền thông báo nếu chưa có. */
async function update(change: (current: ReminderPreferences) => ReminderPreferences, turningOn: boolean) {
  const next = change(await loadPreferences());
  await saveReminderPreferences(next);
  const granted = turningOn
    ? await localNotificationService.requestPermission()
    : await localNotificationService.isPermissionGranted();
  if (granted) await localNotificationService.replaceDailyReminders(buildDailyReminders(next));
}

export const remindersService = {
  async getReminders(): Promise<RemindersSettings> {
    const [preferences, granted] = await Promise.all([
      loadPreferences(),
      localNotificationService.isPermissionGranted().catch(() => false),
    ]);
    return toSettings(preferences, granted);
  },

  async toggleMealReminder(mealType: MealType): Promise<void> {
    const current = await loadPreferences();
    const enabled = !current.meals[mealType];
    await update(prefs => ({ ...prefs, meals: { ...prefs.meals, [mealType]: enabled } }), enabled);
  },

  async toggleWaterReminder(): Promise<void> {
    const enabled = !(await loadPreferences()).water;
    await update(prefs => ({ ...prefs, water: enabled }), enabled);
  },

  async toggleOtherReminder(id: OtherReminderId): Promise<void> {
    const enabled = !(await loadPreferences()).other[id];
    await update(prefs => ({ ...prefs, other: { ...prefs.other, [id]: enabled } }), enabled);
  },

  /** Lên lịch lại theo cài đặt đã lưu (vd. sau khi đăng nhập hoặc vừa cấp quyền trong cài đặt máy). */
  resyncSchedule: resyncReminders,
};
