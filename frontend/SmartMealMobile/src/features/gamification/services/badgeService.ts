import { selectService } from '@/services/api';
import { badgeApiService } from './badgeService.api';
import { badgeMockService } from './badgeService.mock';

// Hook/screen chỉ import `badgeService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock hay gọi
// backend thật (xem serviceSelector.ts).
export const badgeService = selectService('badgeService', badgeMockService, badgeApiService);
