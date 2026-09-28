import type { HealthConnectState } from '../types/profile.types';

// design/HealthConnect.dc.html — khớp ActivitySummary hiển thị ở Dashboard (features/dashboard/
// mocks/dashboard.mock.ts: 6.240 bước, 180 kcal, đồng bộ 08:30).
export const HEALTH_CONNECT_STATE_MOCK: HealthConnectState = {
  connected: true,
  lastSyncedLabel: 'Hôm nay, 08:30',
  sources: [
    { id: 'steps', label: 'Bước chân', todayValueLabel: 'Hôm nay: 6.240 bước', enabled: true },
    { id: 'distance', label: 'Quãng đường', todayValueLabel: 'Hôm nay: 4,3 km', enabled: true },
    {
      id: 'activeCalories',
      label: 'Calo vận động',
      todayValueLabel: 'Hôm nay: 180 kcal',
      enabled: true,
    },
  ],
};
