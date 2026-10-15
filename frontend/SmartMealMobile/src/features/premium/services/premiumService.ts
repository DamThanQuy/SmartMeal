import { selectService } from '@/services/api';
import { premiumApiService } from './premiumService.api';
import { premiumMockService } from './premiumService.mock';

// Hook/screen chỉ import `premiumService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock hay
// gọi backend thật (xem serviceSelector.ts).
export const premiumService = selectService('premiumService', premiumMockService, premiumApiService);
