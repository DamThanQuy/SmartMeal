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
        servingLabel: '1 bát · chưa xác nhận',
        grams: 200,
        nutrition: { calories: 45, proteinG: 3, carbsG: 7, fatG: 1, sugarG: 2, sodiumMg: 380, fiberG: 2 },
        isUncertain: true,
        // design/AISnapUncertain.dc.html — nutritionPerGram suy từ ước tính 200g ở trên
        // (45/200=0.225 kcal/g...) để không lệch số khi user xác nhận đúng khẩu phần "Vừa".
        uncertainResolution: {
          candidates: [
            { id: 'canh-cai', name: 'Canh cải', confidencePercent: 55 },
            { id: 'canh-rau-muong', name: 'Canh rau muống', confidencePercent: 30 },
            { id: 'canh-rau-ngot', name: 'Canh rau ngót', confidencePercent: 15 },
          ],
          portionOptions: [
            { id: 'small', label: 'Nhỏ', grams: 150 },
            { id: 'medium', label: 'Vừa', grams: 200 },
            { id: 'large', label: 'Lớn', grams: 280 },
          ],
          nutritionPerGram: {
            calories: 0.225,
            proteinG: 0.015,
            carbsG: 0.035,
            fatG: 0.005,
            sugarG: 0.01,
            sodiumMg: 1.9,
          },
        },
      },
    ],
  };
}
