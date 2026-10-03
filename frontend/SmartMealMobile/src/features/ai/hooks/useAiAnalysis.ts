import { useMutation } from '@tanstack/react-query';
import type { MealType } from '@/types/meal.types';
import { aiService } from '../services/aiService';

export function useAnalyzeMealPhoto() {
  return useMutation({
    mutationFn: (input: { mealType: MealType; imageUri?: string }) =>
      aiService.analyzeMealPhoto(input.mealType, input.imageUri),
  });
}

// `transcript` là văn bản mô tả bữa ăn (người dùng gõ, hoặc kết quả nhận dạng giọng nói khi có).
// Backend chỉ nhận văn bản, nên không có `transcript` thì bản thật báo chưa hỗ trợ (xem aiService.api).
export function useTranscribeVoice() {
  return useMutation({
    mutationFn: (input: { mealType: MealType; transcript?: string }) =>
      aiService.transcribeVoice(input.mealType, input.transcript),
  });
}
