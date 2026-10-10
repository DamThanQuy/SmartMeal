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
}

export interface CheckSafetyRequestDto {
  barcode?: string;
  ocrRawText?: string;
}

export interface SafetyAlertDto {
  type: string; // ALLERGY, HIGH_SODIUM, HIGH_SUGAR, MEDICAL_WARNING
  message: string;
  severity: string; // INFO, WARNING, DANGER
}

export interface ExtractedNutritionFactsDto {
  caloriesPerServing: number;
  servingSize: string;
  sugarGrams: number;
  sodiumMg: number;
  totalFatGrams: number;
}

export interface CheckSafetyResponseDto {
  isSafe: boolean;
  alerts: SafetyAlertDto[];
  detectedIngredients: string[];
  extractedNutrition?: ExtractedNutritionFactsDto;
}

