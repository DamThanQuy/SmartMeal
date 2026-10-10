import { API_CONFIG } from '@/config/api';
import { api, ENDPOINTS } from '@/services/api';
import type { FridgeIngredient, OcrReviewResult, ScannedProduct } from '../types/scanner.types';
import type {
  CheckSafetyRequestDto,
  CheckSafetyResponseDto,
  FridgeScannerResponseDto,
} from '../types/scanner.api.types';
import type { scannerMockService } from './scannerService.mock';
import { SAMPLE_FRIDGE_IMAGE_DATA_URI } from './sampleFridgeImage';

export const scannerApiService: Partial<typeof scannerMockService> = {
  async scanBarcode(): Promise<ScannedProduct | null> {
    const dto = await api.post<CheckSafetyResponseDto, CheckSafetyRequestDto>(
      ENDPOINTS.ai.checkSafety,
      {
        barcode: '8934567890123',
      },
      { timeout: API_CONFIG.aiTimeout },
    );

    const hasAllergyAlert = dto.alerts.some(a => a.type === 'ALLERGY');
    const hasSugarAlert = dto.alerts.some(a => a.type === 'HIGH_SUGAR');
    const nutrition = dto.extractedNutrition;

    return {
      id: 'prod-scanned-barcode',
      barcode: '8934567890123',
      name: dto.detectedIngredients[0] ? `Sản phẩm ${dto.detectedIngredients[0]}` : 'Bánh ngũ cốc dinh dưỡng',
      packageLabel: nutrition?.servingSize ? `Gói ${nutrition.servingSize}` : 'Hộp 100g',
      nutritionPer100g: {
        calories: nutrition?.caloriesPerServing ?? 240,
        proteinG: 7.2,
        carbsG: 32.5,
        fatG: nutrition?.totalFatGrams ?? 11,
        sugarG: nutrition?.sugarGrams ?? 18,
        sodiumMg: nutrition?.sodiumMg ?? 180,
      },
      allergenIds: hasAllergyAlert ? ['peanut'] : [],
      sugarWarningThreshold: hasSugarAlert ? 15 : 20,
    };
  },

  async analyzeOcrLabel(): Promise<OcrReviewResult> {
    const dto = await api.post<CheckSafetyResponseDto, CheckSafetyRequestDto>(
      ENDPOINTS.ai.checkSafety,
      {
        ocrRawText: 'Năng lượng 240 kcal, Đường 18g, Natri 180mg, Chất béo 11g, Protein 7.2g, Đậu phộng rang',
      },
      { timeout: API_CONFIG.aiTimeout },
    );

    const nutrition = dto.extractedNutrition;
    const hasAllergy = dto.alerts.some(a => a.type === 'ALLERGY');

    return {
      productName: dto.detectedIngredients.length > 0 ? dto.detectedIngredients.slice(0, 3).join(', ') : 'Sản phẩm quét nhãn AI',
      servingLabel: nutrition?.servingSize ?? '100g',
      fields: [
        { label: 'Calo', value: String(nutrition?.caloriesPerServing ?? 240), unit: 'kcal' },
        { label: 'Khẩu phần', value: '100', unit: 'g' },
        { label: 'Protein', value: '7.2', unit: 'g' },
        { label: 'Carbs', value: '32.5', unit: 'g' },
        { label: 'Fat', value: String(nutrition?.totalFatGrams ?? 11), unit: 'g' },
        { label: 'Đường', value: String(nutrition?.sugarGrams ?? 18), unit: 'g', isUncertain: hasAllergy },
        { label: 'Natri', value: String(nutrition?.sodiumMg ?? 180), unit: 'mg' },
      ],
    };
  },

  async scanFridge(imageUri?: string): Promise<FridgeIngredient[]> {
    const targetUri = imageUri || SAMPLE_FRIDGE_IMAGE_DATA_URI;
    const form = new FormData();

    if (typeof window !== 'undefined' && targetUri.startsWith('data:')) {
      const res = await fetch(targetUri);
      const blob = await res.blob();
      form.append('image', blob, 'fridge.jpg');
    } else {
      form.append('image', {
        uri: targetUri,
        name: 'fridge.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
    }

    const dto = await api.post<FridgeScannerResponseDto, FormData>(
      ENDPOINTS.ai.fridgeScanner,
      form,
      {
        timeout: API_CONFIG.aiTimeout,
      },
    );

    if (!dto?.detectedIngredients || dto.detectedIngredients.length === 0) {
      return [];
    }

    return dto.detectedIngredients.map((name, index) => ({
      id: `fridge-ing-${index + 1}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      quantityLabel: '1 phần',
      status: 'confirmed' as const,
    }));
  },
};
