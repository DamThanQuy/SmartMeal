import type { OcrReviewResult } from '../types/scanner.types';

// design/OCRReview.dc.html — 1 field cố ý đọc không chắc (Đường) để minh hoạ cảnh báo OCR.
export const OCR_REVIEW_RESULT_MOCK: OcrReviewResult = {
  productName: 'Sữa chua uống vị dâu',
  servingLabel: '180 ml',
  fields: [
    { label: 'Khẩu phần', value: '180', unit: 'ml' },
    { label: 'Calo', value: '150', unit: 'kcal' },
    { label: 'Protein', value: '4', unit: 'g' },
    { label: 'Carbs', value: '24', unit: 'g' },
    { label: 'Đường', value: '2', unit: 'g', isUncertain: true },
    { label: 'Fat', value: '4', unit: 'g' },
    { label: 'Natri', value: '95', unit: 'mg' },
  ],
};
