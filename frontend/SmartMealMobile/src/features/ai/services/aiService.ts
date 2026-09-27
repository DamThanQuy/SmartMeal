import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import type { MealType } from '@/types/meal.types';
import { createAiSnapResultMock } from '../mocks/aiSnap.mock';
import { createVoiceLogResultMock } from '../mocks/aiVoice.mock';
import type { AIAnalysisResult, VoiceLogResult } from '../types/ai.types';

// TODO: replace mock with real API (BR-060, BR-070 — Backend gọi AI Service/Gemini, mobile
// không bao giờ gọi thẳng LLM — docs/structure_system.md mục 25).

/** design/StateAIFailed.dc.html — AI không nhận diện được, KHÔNG trừ lượt quota. */
export class AiRecognitionFailedError extends Error {}

export const aiService = {
  async analyzeMealPhoto(mealType: MealType): Promise<AIAnalysisResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'empty' || scenario === 'error') {
      throw new AiRecognitionFailedError('Chưa nhận diện được món ăn.');
    }
    const mock = createAiSnapResultMock();
    return { ...mock, mealType };
  },

  async transcribeVoice(mealType: MealType): Promise<VoiceLogResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'empty' || scenario === 'error') {
      throw new AiRecognitionFailedError('Không nhận diện được nội dung ghi âm.');
    }
    const mock = createVoiceLogResultMock();
    return { ...mock, mealType };
  },
};
