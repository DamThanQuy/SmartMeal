import type { AIAnalysisResult } from '../types/ai.types';

// design/AISnap.dc.html — trùng khớp có chủ đích với Bữa trưa đã ghi sẵn trong
// features/nutrition/mocks/diary.mock.ts (mô phỏng đây chính là lượt AI Snap đã tạo ra 3
// món đó), để Dashboard/Diary/AISnapResult luôn nhất quán số liệu.
export function createAiSnapResultMock(): AIAnalysisResult {
  return {
    mealType: 'lunch',
    items: [
      {
        id: 'ai-snap-com-trang',
        name: 'Cơm trắng',
        servingLabel: '1 chén · 150 g',
        grams: 150,
        nutrition: { calories: 195, proteinG: 4, carbsG: 43, fatG: 0, sugarG: 0, sodiumMg: 5, fiberG: 1 },
      },
      {
        id: 'ai-snap-ga-kho',
        name: 'Gà kho',
        servingLabel: '120 g',
        grams: 120,
        nutrition: { calories: 280, proteinG: 25, carbsG: 8, fatG: 15, sugarG: 4, sodiumMg: 620, fiberG: 0 },
      },
      {
        id: 'ai-snap-canh-cai',
        name: 'Canh cải',
        servingLabel: '1 bát',
        grams: 200,
        nutrition: { calories: 45, proteinG: 3, carbsG: 7, fatG: 1, sugarG: 2, sodiumMg: 380, fiberG: 2 },
        isUncertain: true,
      },
    ],
  };
}
