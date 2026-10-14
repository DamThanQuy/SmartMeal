import { selectService } from '@/services/api';
import { notificationsApiService } from './notificationsService.api';
import { notificationsMockService } from './notificationsService.mock';

// Hook/screen chỉ import `notificationsService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng dữ liệu mẫu của design
// hay thông báo thật của server (xem serviceSelector.ts).
export const notificationsService = selectService(
  'notificationsService',
  notificationsMockService,
  notificationsApiService,
);
