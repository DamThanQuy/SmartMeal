import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { FRIDGE_INGREDIENTS_MOCK } from '../mocks/fridge.mock';
import { OCR_REVIEW_RESULT_MOCK } from '../mocks/ocr.mock';
import { SCANNED_PRODUCT_MOCK } from '../mocks/products.mock';
import type { FridgeIngredient, OcrReviewResult, ScannedProduct } from '../types/scanner.types';

export class CameraPermissionDeniedError extends Error {}

export const scannerMockService = {
  async scanBarcode(): Promise<ScannedProduct | null> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new CameraPermissionDeniedError('SmartMeal cần quyền dùng camera.');
    }
    if (scenario === 'empty') {
      return null;
    }
    return SCANNED_PRODUCT_MOCK;
  },

  async analyzeOcrLabel(): Promise<OcrReviewResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new CameraPermissionDeniedError('SmartMeal cần quyền dùng camera.');
    }
    return OCR_REVIEW_RESULT_MOCK;
  },

  async scanFridge(_imageUri?: string): Promise<FridgeIngredient[]> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new CameraPermissionDeniedError('SmartMeal cần quyền dùng camera.');
    }
    if (scenario === 'empty') {
      return [];
    }
    return FRIDGE_INGREDIENTS_MOCK;
  },
};
