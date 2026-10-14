import type { NutritionInfo } from '@/features/nutrition';

// BR-120, BR-130, BR-140 — Barcode/OCR Scanner + Smart Safety Alert. BR-080 — Fridge Scanner.

export type SafetyAlertSeverity = 'info' | 'warning' | 'danger';

/** Cảnh báo an toàn (BR-140): dị ứng, đường/natri/chất béo/calo cao, số liệu chưa kiểm chứng. */
export interface SafetyAlert {
  /** ALLERGY | HIGH_SUGAR | HIGH_SODIUM | HIGH_FAT | HIGH_CALORIES | MEDICAL_WARNING | UNVERIFIED. */
  type: string;
  message: string;
  severity: SafetyAlertSeverity;
}

export interface ScannedProduct {
  /** Id thực phẩm trong CSDL (ghi kèm vào nhật ký). */
  id: string;
  barcode: string;
  name: string;
  packageLabel: string;
  nutritionPer100g: NutritionInfo;
  /** Id trong ALLERGY_OPTIONS (features/health) — BR-140. */
  allergenIds: string[];
  /** Cảnh báo do server tính theo hồ sơ người dùng và ngưỡng cấu hình. */
  alerts: SafetyAlert[];
  /** Số liệu đã được kiểm chứng (false với món người dùng tự nhập/chưa rà soát). */
  isVerified: boolean;
}

export interface OcrNutritionField {
  label: string;
  value: string;
  unit: string;
  /** true khi nhãn không ghi hoặc đọc không chắc — design/OCRReview.dc.html ("Không rõ · kiểm tra lại"). */
  isUncertain?: boolean;
}

export interface OcrReviewResult {
  productName: string;
  servingLabel: string;
  fields: OcrNutritionField[];
  alerts: SafetyAlert[];
  detectedIngredients: string[];
  /** Văn bản AI đọc được trên nhãn — để người dùng đối chiếu. */
  ocrText?: string;
  /** Dữ liệu mẫu (server chưa cấu hình AI), không phải kết quả đọc thật. */
  isDemo: boolean;
}

export type FridgeIngredientStatus = 'confirmed' | 'uncertain';

export interface FridgeIngredient {
  id: string;
  name: string;
  quantityLabel: string;
  status: FridgeIngredientStatus;
}

export interface FridgeScanResult {
  ingredients: FridgeIngredient[];
  /** Dữ liệu mẫu (server chưa cấu hình AI) — màn hình phải ghi rõ. */
  isDemo: boolean;
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
