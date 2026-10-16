import { useMutation } from '@tanstack/react-query';
import type { MealType } from '@/types/meal.types';
import { aiService } from '../services/aiService';

export function useAnalyzeMealPhoto() {
  return useMutation({
    mutationFn: (input: { mealType: MealType; imageUri?: string }) =>
      aiService.analyzeMealPhoto(input.mealType, input.imageUri),
  });
}

// `audioUri` — file ghi âm vừa thu (gửi /ai/voice-log/audio); `transcript` — văn bản người dùng gõ
// (gửi /ai/voice-log). Có file ghi âm thì ưu tiên file.
export function useTranscribeVoice() {
  return useMutation({
    mutationFn: (input: { mealType: MealType; transcript?: string; audioUri?: string }) =>
      input.audioUri
        ? aiService.transcribeVoiceAudio(input.mealType, input.audioUri)
        : aiService.transcribeVoice(input.mealType, input.transcript),
  });
}

/** Phụ đề tạm khi đang ghi âm: chép lời đoạn đã ghi tới lúc đó (không bóc món, không trừ lượt). */
export function useTranscribeVoiceDraft() {
  return useMutation({
    mutationFn: (audioUri: string) => aiService.transcribeVoiceDraft(audioUri),
  });
}
