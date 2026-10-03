import { selectService } from '@/services/api';
import { healthProfileApiService } from './healthProfileService.api';
import { healthProfileMockService } from './healthProfileService.mock';

// Hook/screen chỉ import `healthProfileService` như cũ; EXPO_PUBLIC_USE_MOCK_API quyết định dùng
// bản mock hay gọi backend thật (hàm chưa nối API tự dùng mock — xem serviceSelector.ts).
export const healthProfileService = selectService(
  'healthProfileService',
  healthProfileMockService,
  healthProfileApiService,
);
