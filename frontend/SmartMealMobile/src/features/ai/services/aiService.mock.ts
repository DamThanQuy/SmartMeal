import { addDays, startOfDay } from 'date-fns';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { isPremiumActive } from '@/state/premium/premiumStore';
import type { MealType } from '@/types/meal.types';
import { createAiSnapResultMock } from '../mocks/aiSnap.mock';
import { createVoiceLogResultMock } from '../mocks/aiVoice.mock';
import { DAILY_AI_QUOTA_LIMIT, useAiQuotaStore } from '../state/aiQuotaStore';
import type { AIAnalysisResult, AiQuota, VoiceLogResult } from '../types/ai.types';
import { AiRecognitionFailedError } from './ai.errors';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API=true) — bản gọi API thật nằm ở aiService.api.ts, aiService.ts
// chọn giữa hai bản.
// TODO: replace mock with real API (BR-060, BR-070 — Backend gọi AI Service/Gemini, mobile
// không bao giờ gọi thẳng LLM — docs/structure_system.md mục 25).

export const aiMockService = {
  // BR-233 — Free có 5 lượt/ngày (đếm cục bộ), Pro không giới hạn; làm mới lúc 00:00 giờ máy.
  async getQuota(): Promise<AiQuota> {
    const used = useAiQuotaStore.getState().usedToday;
    const resetsAtIso = addDays(startOfDay(new Date()), 1).toISOString();
    if (isPremiumActive()) {
      return { isUnlimited: true, limit: null, used, remaining: null, resetsAtIso };
    }
    return {
      isUnlimited: false,
      limit: DAILY_AI_QUOTA_LIMIT,
      used,
      remaining: Math.max(DAILY_AI_QUOTA_LIMIT - used, 0),
      resetsAtIso,
    };
  },

  // Gọi sau mỗi lần AI phân tích THÀNH CÔNG (thất bại thì không trừ lượt). Mock tự đếm; bản thật để
  // server đếm (POST /ai/* ghi nhận lượt khi thành công) nên không làm gì.
  async recordUsage(): Promise<void> {
    useAiQuotaStore.getState().consumeQuota();
  },

  async analyzeMealPhoto(mealType: MealType, _imageUri?: string): Promise<AIAnalysisResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'empty' || scenario === 'error') {
      throw new AiRecognitionFailedError('Chưa nhận diện được món ăn.');
    }
    const mock = createAiSnapResultMock();
    return { ...mock, mealType };
  },

  async transcribeVoice(mealType: MealType, _transcript?: string): Promise<VoiceLogResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'empty' || scenario === 'error') {
      throw new AiRecognitionFailedError('Không nhận diện được nội dung ghi âm.');
    }
    const mock = createVoiceLogResultMock();
    return { ...mock, mealType };
  },
};
