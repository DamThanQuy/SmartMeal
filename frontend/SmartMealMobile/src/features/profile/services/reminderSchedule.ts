import type { MealType } from '@/types/meal.types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import type { OtherReminderId } from '../types/profile.types';

// Nhắc nhở chạy CỤC BỘ trên máy (expo-notifications, không cần backend — báo cáo gap mục Reminders P2).
// Phần thuần: cài đặt đang bật → danh sách thông báo hằng ngày cần lên lịch.

export interface ReminderPreferences {
  meals: Record<MealType, boolean>;
  water: boolean;
  other: Record<OtherReminderId, boolean>;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  meals: { breakfast: true, lunch: true, dinner: true, snack: false },
  water: true,
  other: { streak: true, challenge: true },
};

export interface ClockTime {
  hour: number;
  minute: number;
}

export const MEAL_REMINDER_TIMES: Record<MealType, ClockTime> = {
  breakfast: { hour: 7, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 30 },
  snack: { hour: 15, minute: 0 },
};

/** Nhắc uống nước mỗi 2 giờ từ 08:00 đến 20:00. */
export const WATER_REMINDER_HOURS = [8, 10, 12, 14, 16, 18, 20] as const;
export const STREAK_REMINDER_TIME: ClockTime = { hour: 20, minute: 0 };

export interface DailyReminder extends ClockTime {
  /** Định danh ổn định — lên lịch lại thì huỷ đúng các thông báo của SmartMeal. */
  id: string;
  title: string;
  body: string;
}

export const REMINDER_ID_PREFIX = 'smartmeal-reminder-';

export function formatClock({ hour, minute }: ClockTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function buildDailyReminders(preferences: ReminderPreferences): DailyReminder[] {
  const reminders: DailyReminder[] = [];
  for (const mealType of Object.keys(MEAL_REMINDER_TIMES) as MealType[]) {
    if (!preferences.meals[mealType]) continue;
    reminders.push({
      id: `${REMINDER_ID_PREFIX}meal-${mealType}`,
      ...MEAL_REMINDER_TIMES[mealType],
      title: `Đến giờ ${MEAL_TYPE_TITLES[mealType].toLowerCase()}`,
      body: 'Ghi lại bữa ăn để theo dõi calo hôm nay nhé.',
    });
  }
  if (preferences.water) {
    for (const hour of WATER_REMINDER_HOURS) {
      reminders.push({
        id: `${REMINDER_ID_PREFIX}water-${hour}`,
        hour,
        minute: 0,
        title: 'Uống nước thôi',
        body: 'Một ly nước giúp bạn giữ đủ nước cả ngày.',
      });
    }
  }
  if (preferences.other.streak) {
    reminders.push({
      id: `${REMINDER_ID_PREFIX}streak`,
      ...STREAK_REMINDER_TIME,
      title: 'Giữ chuỗi ngày',
      body: 'Ghi ít nhất một bữa hôm nay để không mất chuỗi.',
    });
  }
  // `challenge` không có giờ cố định: cập nhật thử thách hiện trong ứng dụng, không lên lịch ở máy.
  return reminders;
}

/** Dữ liệu hỏng/thiếu field → dùng mặc định, không ném lỗi. */
export function parseReminderPreferences(raw: string | undefined): ReminderPreferences {
  if (!raw) return DEFAULT_REMINDER_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_REMINDER_PREFERENCES;
    const record = parsed as Partial<Record<keyof ReminderPreferences, unknown>>;
    const pick = <T extends Record<string, boolean>>(value: unknown, fallback: T): T => {
      const source = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
      return Object.fromEntries(
        Object.entries(fallback).map(([key, def]) => [key, typeof source[key] === 'boolean' ? source[key] : def]),
      ) as T;
    };
    return {
      meals: pick(record.meals, DEFAULT_REMINDER_PREFERENCES.meals),
      water: typeof record.water === 'boolean' ? record.water : DEFAULT_REMINDER_PREFERENCES.water,
      other: pick(record.other, DEFAULT_REMINDER_PREFERENCES.other),
    };
  } catch {
    return DEFAULT_REMINDER_PREFERENCES;
  }
}
