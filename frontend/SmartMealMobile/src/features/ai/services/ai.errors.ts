import { isApiError } from '@/services/api/errors';

/** design/StateAIFailed.dc.html — AI không nhận diện được, KHÔNG trừ lượt quota. */
export class AiRecognitionFailedError extends Error {}

/** Hết lượt AI miễn phí trong ngày (BE trả 429 — BR-233): chuyển sang màn "Hết lượt AI". */
export function isAiQuotaExceededError(error: unknown): boolean {
  return isApiError(error) && error.code === 'RATE_LIMITED';
}
