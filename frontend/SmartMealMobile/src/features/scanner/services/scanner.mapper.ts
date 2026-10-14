import type { MetaCatalog } from '@/features/health';
import type { CheckSafetyResponseDto, ExtractedNutritionFactsDto, SafetyAlertDto } from '../types/scanner.api.types';
import type { FridgeIngredient, OcrNutritionField, OcrReviewResult, SafetyAlert, ScannedProduct } from '../types/scanner.types';

// Quy đổi kết quả /ai/check-safety, /ai/scan-label, /ai/fridge-scanner → type FE. Chỉ hiển thị số liệu
// server trả về; trường nào nhãn không ghi thì để trống và đánh dấu "không rõ" — không điền số mặc
// định (review PR #9 S1/S2).

function toSeverity(value: string): SafetyAlert['severity'] {
  const normalized = value.toLowerCase();
  return normalized === 'danger' ? 'danger' : normalized === 'info' ? 'info' : 'warning';
}

export function fromSafetyAlerts(alerts: SafetyAlertDto[]): SafetyAlert[] {
  const order = { danger: 0, warning: 1, info: 2 } as const;
  return alerts
    .map(alert => ({ type: alert.type, message: alert.message, severity: toSeverity(alert.severity) }))
    .sort((a, b) => order[a.severity] - order[b.severity]);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Tra mã vạch trong CSDL → sản phẩm (dinh dưỡng trên 100 g). Null khi server không có sản phẩm. */
export function fromBarcodeCheck(code: string, dto: CheckSafetyResponseDto, catalog: MetaCatalog): ScannedProduct | null {
  if (!dto.product) return null;
  const nutrition = dto.extractedNutrition;
  const allergenIds = dto.product.allergyIds
    .map(id => catalog.allergies.codeById(id))
    .filter((id): id is string => id !== undefined);
  return {
    id: dto.product.foodId,
    barcode: dto.product.barcode ?? code,
    name: dto.product.name,
    packageLabel: dto.product.isUserCreated ? 'Do bạn nhập · dinh dưỡng / 100 g' : 'Dinh dưỡng / 100 g',
    nutritionPer100g: {
      calories: round(nutrition?.caloriesPerServing ?? 0),
      proteinG: round(nutrition?.proteinGrams ?? 0),
      carbsG: round(nutrition?.carbsGrams ?? 0),
      fatG: round(nutrition?.totalFatGrams ?? 0),
      sugarG: round(nutrition?.sugarGrams ?? 0),
      sodiumMg: round(nutrition?.sodiumMg ?? 0),
    },
    allergenIds,
    alerts: fromSafetyAlerts(dto.alerts),
    isVerified: dto.product.isVerified,
  };
}

function field(label: string, value: number | null | undefined, unit: string): OcrNutritionField {
  return value === null || value === undefined
    ? { label, value: '', unit, isUncertain: true }
    : { label, value: String(round(value)), unit };
}

function servingFields(nutrition: ExtractedNutritionFactsDto): OcrNutritionField[] {
  const per100 = nutrition.basis === 'per100g';
  return [
    field('Khẩu phần', per100 ? 100 : nutrition.servingGrams, 'g'),
    field('Calo', nutrition.caloriesPerServing, 'kcal'),
    field('Protein', nutrition.proteinGrams, 'g'),
    field('Carbs', nutrition.carbsGrams, 'g'),
    field('Fat', nutrition.totalFatGrams, 'g'),
    field('Đường', nutrition.sugarGrams, 'g'),
    field('Natri', nutrition.sodiumMg, 'mg'),
  ];
}

/** Đọc nhãn từ ảnh → bảng để người dùng kiểm tra/sửa trước khi lưu (BR-130). */
export function fromLabelScan(dto: CheckSafetyResponseDto): OcrReviewResult {
  const nutrition = dto.extractedNutrition;
  return {
    productName: dto.productName?.trim() ?? '',
    servingLabel: nutrition ? (nutrition.basis === 'per100g' ? '100 g' : nutrition.servingSize || 'Khẩu phần') : 'Khẩu phần',
    fields: nutrition
      ? servingFields(nutrition)
      : ['Khẩu phần', 'Calo', 'Protein', 'Carbs', 'Fat', 'Đường', 'Natri'].map(label => field(label, null, '')),
    alerts: fromSafetyAlerts(dto.alerts),
    detectedIngredients: dto.detectedIngredients,
    ocrText: dto.ocrText ?? undefined,
    isDemo: dto.isDemo,
  };
}

/** Gộp nguyên liệu từ nhiều ảnh (bỏ trùng không phân biệt hoa/thường); mọi món đều chờ người dùng xác nhận (BR-080). */
export function toFridgeIngredients(names: string[]): FridgeIngredient[] {
  const seen = new Set<string>();
  return names
    .map(name => name.trim())
    .filter(name => {
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((name, index) => ({ id: `fridge-${index + 1}`, name, quantityLabel: '', status: 'uncertain' as const }));
}
