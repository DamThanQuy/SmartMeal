import { selectService } from '@/services/api';
import { authApiService } from './authService.api';
import { authMockService } from './authService.mock';

// Hook/screen chỉ import `authService` như cũ; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock
// hay gọi backend thật (hàm chưa nối API tự dùng mock — xem serviceSelector.ts).
export const authService = selectService('authService', authMockService, authApiService);
