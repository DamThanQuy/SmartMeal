import { selectService } from '@/services/api';
import { healthConnectApiService } from './healthConnectService.api';
import { healthConnectMockService } from './healthConnectService.mock';

// Hook/screen chỉ import `healthConnectService` như cũ; EXPO_PUBLIC_USE_MOCK_API quyết định dùng
// bản mock hay đọc số liệu từ backend (xem serviceSelector.ts).
export const healthConnectService = selectService(
  'healthConnectService',
  healthConnectMockService,
  healthConnectApiService,
);
