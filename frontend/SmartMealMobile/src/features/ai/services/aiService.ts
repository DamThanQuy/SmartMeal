import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { apiClient, unwrap, type ApiEnvelope } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { MealType } from '@/types/meal.types';
import { createAiSnapResultMock } from '../mocks/aiSnap.mock';
import { createVoiceLogResultMock } from '../mocks/aiVoice.mock';
import type { AIAnalysisResult, VoiceLogResult } from '../types/ai.types';

// TODO: replace mock with real API (BR-060, BR-070 — Backend gọi AI Service/Gemini, mobile
// không bao giờ gọi thẳng LLM — docs/structure_system.md mục 25).

/** design/StateAIFailed.dc.html — AI không nhận diện được, KHÔNG trừ lượt quota. */
export class AiRecognitionFailedError extends Error {}

interface SnapApiResponse {
  dishName: string;
  estimatedGrams: number;
  confidenceScore: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  allergyWarnings: string[];
  healthTips: string | null;
  detectedIngredients: string[];
}

interface VoiceApiResponse {
  extractedItems: Array<{
    foodName: string;
    portionDescription: string;
    portionGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

export const aiService = {
  async analyzeMealPhoto(mealType: MealType, imageUri?: string): Promise<AIAnalysisResult> {
    if (imageUri) {
      const form = new FormData();
      form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' } as unknown as Blob);
      const response = await apiClient.post<ApiEnvelope<SnapApiResponse>>(ENDPOINTS.ai.snapAndTrack, form, { timeout: 60000 });
      const data = unwrap(response);
      return {
        mealType,
        items: [{
          id: 'snap-1',
          name: data.dishName,
          servingLabel: `${Math.round(data.estimatedGrams)} g`,
          grams: Math.round(data.estimatedGrams),
          nutrition: {
            calories: Math.round(data.calories),
            proteinG: Math.round(data.protein),
            carbsG: Math.round(data.carbs),
            fatG: Math.round(data.fat),
          },
          isUncertain: data.confidenceScore < 0.6,
        }],
        allergyWarnings: data.allergyWarnings,
        healthTips: data.healthTips ?? undefined,
        detectedIngredients: data.detectedIngredients,
      };
    }
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'empty' || scenario === 'error') {
      throw new AiRecognitionFailedError('Chưa nhận diện được món ăn.');
    }
    const mock = createAiSnapResultMock();
    return { ...mock, mealType };
  },

  async transcribeVoice(mealType: MealType, transcript?: string): Promise<VoiceLogResult> {
    if (transcript) {
      const response = await apiClient.post<ApiEnvelope<VoiceApiResponse>>(ENDPOINTS.ai.voiceLog, { transcript });
      const data = unwrap(response);
      return {
        mealType,
        transcript,
        items: data.extractedItems.map((item, index) => ({
          id: `voice-${index}`,
          name: item.foodName,
          servingLabel: item.portionDescription,
          grams: item.portionGrams,
          nutrition: {
            calories: item.calories,
            proteinG: item.protein,
            carbsG: item.carbs,
            fatG: item.fat,
          },
        })),
      };
    }
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'empty' || scenario === 'error') {
      throw new AiRecognitionFailedError('Không nhận diện được nội dung ghi âm.');
    }
    const mock = createVoiceLogResultMock();
    return { ...mock, mealType };
  },
};
