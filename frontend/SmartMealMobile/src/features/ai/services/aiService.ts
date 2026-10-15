import { aiApiService } from './aiService.api';

export const aiService = aiApiService;

export { AiRecognitionFailedError, isAiQuotaExceededError } from './ai.errors';
