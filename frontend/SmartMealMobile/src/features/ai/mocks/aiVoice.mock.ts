import type { VoiceLogResult } from '../types/ai.types';

// design/VoiceLog.dc.html — trùng khớp có chủ đích với Bữa sáng đã ghi sẵn trong
// features/nutrition/mocks/diary.mock.ts.
export function createVoiceLogResultMock(): VoiceLogResult {
  return {
    mealType: 'breakfast',
    transcript: 'Sáng nay tôi ăn một tô bún bò và uống một ly nước cam.',
    items: [
      {
        id: 'ai-voice-bun-bo',
        name: 'Bún bò',
        servingLabel: '1 tô',
        grams: 450,
        nutrition: { calories: 420, proteinG: 23, carbsG: 46, fatG: 14, sugarG: 3, sodiumMg: 1400, fiberG: 2 },
      },
      {
        id: 'ai-voice-nuoc-cam',
        name: 'Nước cam',
        servingLabel: '1 ly · 250 ml',
        grams: 250,
        nutrition: { calories: 110, proteinG: 1, carbsG: 26, fatG: 0, sugarG: 22, sodiumMg: 5, fiberG: 0 },
      },
    ],
    portionQuestion: {
      itemId: 'ai-voice-bun-bo',
      question: 'Tô bún bò cỡ nào?',
      description: 'Chọn để ước tính calo chính xác hơn.',
      options: [
        { id: 'small', label: 'Nhỏ', grams: 350 },
        { id: 'medium', label: 'Vừa', grams: 450 },
        { id: 'large', label: 'Lớn', grams: 600 },
      ],
    },
  };
}
