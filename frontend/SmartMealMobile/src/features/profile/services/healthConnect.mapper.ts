import { format } from 'date-fns';
import type { DailyActivity } from '@/features/nutrition';
import { parseApiDateTime } from '@/utils/date';
import type { HealthConnectState } from '../types/profile.types';
import type { HealthConnectPreferences } from './healthConnectPreferences';

// Hàm thuần dựng trạng thái màn Health Connect từ tùy chọn cục bộ + số liệu thật của backend.

function formatKm(distanceMeters: number): string {
  return (distanceMeters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

export function toHealthConnectState(
  preferences: HealthConnectPreferences,
  activity: DailyActivity,
): HealthConnectState {
  const isEnabled = (id: HealthConnectState['sources'][number]['id']) =>
    !preferences.disabledSources.includes(id);

  return {
    connected: preferences.connected,
    lastSyncedLabel: activity.lastSyncedAt
      ? `Hôm nay, ${format(parseApiDateTime(activity.lastSyncedAt), 'HH:mm')}`
      : 'Chưa đồng bộ',
    sources: [
      {
        id: 'steps',
        label: 'Bước chân',
        todayValueLabel: `Hôm nay: ${activity.steps.toLocaleString('vi-VN')} bước`,
        enabled: isEnabled('steps'),
      },
      {
        id: 'distance',
        label: 'Quãng đường',
        todayValueLabel: `Hôm nay: ${formatKm(activity.distanceMeters)} km`,
        enabled: isEnabled('distance'),
      },
      {
        id: 'activeCalories',
        label: 'Calo vận động',
        todayValueLabel: `Hôm nay: ${activity.caloriesBurned} kcal`,
        enabled: isEnabled('activeCalories'),
      },
    ],
  };
}
