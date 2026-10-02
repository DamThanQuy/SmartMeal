import { parseDateIso } from '@/utils/date';
import { TODAY_ACTIVITY_CALORIES_BURNED_MOCK } from '../mocks/diary.mock';
import type { DailyActivity } from '../types/healthSync.types';

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
    };
  },
};
