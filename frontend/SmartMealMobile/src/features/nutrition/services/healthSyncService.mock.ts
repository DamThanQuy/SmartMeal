import { parseDateIso } from '@/utils/date';
import { TODAY_ACTIVITY_CALORIES_BURNED_MOCK } from '../mocks/diary.mock';
import type { ActivityLogItem, ActivitySourceDetail, DailyActivity } from '../types/healthSync.types';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API=true) — design/Dashboard.dc.html mục "Vận động" và
// design/CalorieBudget.dc.html: 6.240 bước, 180 kcal (đọc từ đúng 1 nguồn RAW của nutrition,
// BR-042), đồng bộ lúc 08:30. Không có độ trễ/scenario riêng vì mọi nơi gọi nó đều đi kèm
// nutritionService.getDiaryDay() vốn đã mô phỏng Loading/Error.
// TODO: replace mock with real API — bản thật nằm ở healthSyncService.api.ts.
const MOCK_STEPS = 6240;
const MOCK_STEP_GOAL = 10000;
const MOCK_DISTANCE_METERS = 4700;
const MOCK_SYNC_HOUR = 8;
const MOCK_SYNC_MINUTE = 30;

// design/CalorieBudget.dc.html "Nguồn vận động"/"Hoạt động được tính" — Health Connect là nguồn
// DUY NHẤT được cộng; đồng hồ thông minh báo cùng khung giờ (06:30–17:20) nên bị bỏ qua, minh
// hoạ trực quan cho BR-042 (chỉ để hiển thị, ngân sách thật chỉ dùng caloriesBurned).
const MOCK_SOURCE_DETAILS: ActivitySourceDetail[] = [
  {
    id: 'health-connect',
    label: 'Health Connect',
    calories: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
    countsTowardBudget: true,
    note: 'Nguồn đang dùng cho hôm nay',
  },
  {
    id: 'smart-watch',
    label: 'Đồng hồ thông minh',
    calories: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
    countsTowardBudget: false,
    note: 'Cùng khung giờ với Health Connect nên không cộng lần hai',
  },
];

const MOCK_ACTIVITIES: ActivityLogItem[] = [
  { label: 'Đi bộ', windowLabel: '06:30 – 07:10', calories: 120 },
  { label: 'Đạp xe', windowLabel: '17:00 – 17:20', calories: 60 },
];

export const healthSyncMockService = {
  async getDailySummary(dateIso: string): Promise<DailyActivity> {
    const syncedAt = parseDateIso(dateIso);
    syncedAt.setHours(MOCK_SYNC_HOUR, MOCK_SYNC_MINUTE, 0, 0);
    return {
      dateIso,
      steps: MOCK_STEPS,
      stepGoal: MOCK_STEP_GOAL,
      caloriesBurned: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
      distanceMeters: MOCK_DISTANCE_METERS,
      sources: ['Health Connect'],
      lastSyncedAt: syncedAt.toISOString(),
      hasSyncedData: true,
      sourceDetails: MOCK_SOURCE_DETAILS,
      activities: MOCK_ACTIVITIES,
    };
  },
};
