import type { MealType } from '@/types/meal.types';

// BR-180→BR-183 (Reminders), BR-220→BR-222 (Notifications) — business_rule.md hiện chưa có
// đúng số BR này (chỉ có BR-001→003 Profile và BR-230+ Premium); tạm dựng theo design.md mục
// "Reminders/Notifications" + artboard, không tự suy diễn thêm nghiệp vụ ngoài UI hiển thị.

export interface MealReminderItem {
  mealType: MealType;
  timeLabel: string;
  enabled: boolean;
}

export interface WaterReminderSettings {
  enabled: boolean;
  /** "Mỗi 2 giờ · 08:00–20:00 · 8 ly/ngày" — design/Reminders.dc.html. */
  summaryLabel: string;
}

export type OtherReminderId = 'streak' | 'challenge';

export interface OtherReminderItem {
  id: OtherReminderId;
  label: string;
  description: string;
  enabled: boolean;
}

export interface RemindersSettings {
  systemNotificationsEnabled: boolean;
  meals: MealReminderItem[];
  water: WaterReminderSettings;
  other: OtherReminderItem[];
}

export type NotificationIcon =
  | 'quickLog'
  | 'pet'
  | 'water'
  | 'healthConnect'
  | 'grocery'
  | 'challenge';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  read: boolean;
  icon: NotificationIcon;
  section: 'today' | 'earlier';
}

export type HealthConnectSourceId = 'steps' | 'distance' | 'activeCalories';

export interface HealthConnectSource {
  id: HealthConnectSourceId;
  label: string;
  todayValueLabel: string;
  enabled: boolean;
}

export interface HealthConnectState {
  connected: boolean;
  lastSyncedLabel: string;
  sources: HealthConnectSource[];
}
