import { selectService } from '@/services/api';
import { nutritionApiService } from './nutritionService.api';
import { nutritionMockService } from './nutritionService.mock';

// Hook/screen chỉ import `nutritionService` như cũ; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản
// mock hay gọi backend thật (hàm chưa nối API tự dùng mock — xem serviceSelector.ts).
export const nutritionService = selectService(
  'nutritionService',
  nutritionMockService,
  nutritionApiService,
);

// Nhiều screen import các tiện ích này từ đúng đường dẫn của service (và index.ts export * từ đây)
// nên giữ nguyên chỗ export khi tách mock/api.
export { todayIso } from '@/utils/date';
export { findFoodById } from './nutritionService.mock';
export { PartialLogError, UpdateIncompleteError } from './nutrition.errors';
