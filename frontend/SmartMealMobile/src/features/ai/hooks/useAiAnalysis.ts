import { useMutation } from '@tanstack/react-query';
import type { MealType } from '@/types/meal.types';
import { aiService } from '../services/aiService';

export function useAnalyzeMealPhoto() {
  return useMutation({
    mutationFn: (input: { mealType: MealType; imageUri?: string }) =>
      aiService.analyzeMealPhoto(input.mealType, input.imageUri),
  });
}

export function useTranscribeVoice() {
  return useMutation({
    mutationFn: (mealType: MealType) => aiService.transcribeVoice(mealType),
  });
}
