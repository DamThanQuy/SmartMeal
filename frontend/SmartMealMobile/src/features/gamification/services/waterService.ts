import { selectService } from '@/services/api';
import { waterApiService } from './waterService.api';
import { waterMockService } from './waterService.mock';

// Hook/screen chỉ import `waterService` như cũ; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock
// hay gọi backend thật (hàm chưa nối API tự dùng mock — xem serviceSelector.ts).
export const waterService = selectService('waterService', waterMockService, waterApiService);

/** Một ly nước mặc định (ml). */
export const CUP_ML = 250;
