import type { RemindersSettings } from '../types/profile.types';

// design/Reminders.dc.html.
export const REMINDERS_SETTINGS_MOCK: RemindersSettings = {
  systemNotificationsEnabled: false,
  meals: [
    { mealType: 'breakfast', timeLabel: '07:00 hằng ngày', enabled: true },
    { mealType: 'lunch', timeLabel: '12:00 hằng ngày', enabled: true },
    { mealType: 'dinner', timeLabel: '18:30 hằng ngày', enabled: true },
    { mealType: 'snack', timeLabel: 'Tắt', enabled: false },
  ],
  water: {
    enabled: true,
    summaryLabel: 'Mỗi 2 giờ · 08:00–20:00 · 8 ly/ngày',
  },
  other: [
    {
      id: 'streak',
      label: 'Nhắc giữ chuỗi ngày',
      description: '20:00 nếu chưa hoàn thành',
      enabled: true,
    },
    {
      id: 'challenge',
      label: 'Thử thách & phần thưởng',
      description: 'Khi có cập nhật',
      enabled: true,
    },
  ],
};
