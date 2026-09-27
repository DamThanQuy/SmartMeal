import type { NutritionInfo } from '@/features/nutrition';

// BR-120, BR-130, BR-140 — Barcode/OCR Scanner + Smart Safety Alert. BR-080 — Fridge Scanner.

export interface ScannedProduct {
  id: string;
  barcode: string;
  name: string;
  packageLabel: string;
  nutritionPer100g: NutritionInfo;
  /** Id trong ALLERGY_OPTIONS (features/health) — BR-140. */
  allergenIds: string[];
  /** Ngưỡng cấu hình để cảnh báo (BR-140), vd. đường ≥ 20g/100g. */
  sugarWarningThreshold?: number;
}

export interface OcrNutritionField {
  label: string;
  value: string;
  unit: string;
  /** true khi OCR đọc không chắc chắn — design/OCRReview.dc.html ("Không rõ · kiểm tra lại"). */
  isUncertain?: boolean;
}

export interface OcrReviewResult {
  productName: string;
  servingLabel: string;
  fields: OcrNutritionField[];
}

export type FridgeIngredientStatus = 'confirmed' | 'uncertain';

export interface FridgeIngredient {
  id: string;
  name: string;
  quantityLabel: string;
  status: FridgeIngredientStatus;
}

export function ocrFieldsToNutrition(fields: OcrNutritionField[]): NutritionInfo {
  const byLabel = (label: string) => Number(fields.find(f => f.label === label)?.value) || 0;
  return {
    calories: byLabel('Calo'),
    proteinG: byLabel('Protein'),
    carbsG: byLabel('Carbs'),
    fatG: byLabel('Fat'),
    sugarG: byLabel('Đường'),
    sodiumMg: byLabel('Natri'),
  };
}
