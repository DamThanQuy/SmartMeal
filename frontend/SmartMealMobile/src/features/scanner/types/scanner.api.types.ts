// DTO /ai/check-safety, /ai/scan-label, /ai/fridge-scanner (docs/SmartMeal_API_Contract.md) — chỉ
// service và mapper import.

export interface FridgeRecipeSuggestionDto {
  title: string;
  description: string;
  calories: number;
  cookingTimeMinutes: number;
  matchingIngredients: string[];
  missingIngredients: string[];
  quickInstructions: string;
}

export interface FridgeScannerResponseDto {
  detectedIngredients: string[];
  suggestedRecipes: FridgeRecipeSuggestionDto[];
  isDemo: boolean;
}

/** Cần ít nhất một trong hai. Mã vạch được tra trong CSDL (không gửi cho AI đoán). */
export interface CheckSafetyRequestDto {
  barcode?: string;
  ocrRawText?: string;
}

export interface SafetyAlertDto {
  type: string;
  message: string;
  /** INFO | WARNING | DANGER. */
  severity: string;
}

export interface ExtractedNutritionFactsDto {
  /** Năng lượng theo `basis`. */
  caloriesPerServing: number;
  servingSize: string;
  sugarGrams: number;
  sodiumMg: number;
  totalFatGrams: number;
  /** null khi nhãn không ghi. */
  proteinGrams: number | null;
  carbsGrams: number | null;
  servingGrams: number | null;
  /** perServing | per100g. */
  basis: string;
}

export interface ScannedProductDto {
  foodId: string;
  name: string;
  barcode: string | null;
  isVerified: boolean;
  isUserCreated: boolean;
  allergyIds: number[];
  matchedAllergyIds: number[];
}

export interface CheckSafetyResponseDto {
  isSafe: boolean;
  alerts: SafetyAlertDto[];
  detectedIngredients: string[];
  extractedNutrition: ExtractedNutritionFactsDto | null;
  isDemo: boolean;
  /** database | ai | demo. */
  source: string;
  product: ScannedProductDto | null;
  productName: string | null;
  ocrText: string | null;
}
