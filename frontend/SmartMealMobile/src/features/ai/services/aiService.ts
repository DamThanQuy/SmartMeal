import { selectService } from '@/services/api';
import { aiApiService } from './aiService.api';
import { aiMockService } from './aiService.mock';

// Hook/screen chỉ import `aiService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock hay gọi
// backend thật (xem serviceSelector.ts).
export const aiService = selectService('aiService', aiMockService, aiApiService);

export { AiRecognitionFailedError, isAiQuotaExceededError } from './ai.errors';
