import { useMutation } from '@tanstack/react-query';
import type { MealType } from '@/types/meal.types';
import { aiService } from '../services/aiService';

export function useAnalyzeMealPhoto() {
  return useMutation({
    mutationFn: (mealType: MealType) => aiService.analyzeMealPhoto(mealType),
  });
}

export function useTranscribeVoice() {
  return useMutation({
    mutationFn: (mealType: MealType) => aiService.transcribeVoice(mealType),
  });
}
