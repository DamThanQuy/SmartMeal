import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { FRIDGE_INGREDIENTS_MOCK } from '../mocks/fridge.mock';
import { OCR_REVIEW_RESULT_MOCK } from '../mocks/ocr.mock';
import { SCANNED_PRODUCT_MOCK } from '../mocks/products.mock';
import type { FridgeScanResult, OcrReviewResult, ScannedProduct } from '../types/scanner.types';

export class CameraPermissionDeniedError extends Error {}

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API) — cùng chữ ký với scannerService.api.ts; mã vạch/ảnh thật
// được nhận nhưng kết quả lấy từ dữ liệu mẫu, MOCK_SCENARIO 'empty' = không tìm thấy sản phẩm.
export const scannerMockService = {
  async scanBarcode(_code: string): Promise<ScannedProduct | null> {
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

  async analyzeOcrLabel(_imageUri: string): Promise<OcrReviewResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new CameraPermissionDeniedError('SmartMeal cần quyền dùng camera.');
    }
    return OCR_REVIEW_RESULT_MOCK;
  },

  async scanFridge(_imageUris: string[]): Promise<FridgeScanResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new CameraPermissionDeniedError('SmartMeal cần quyền dùng camera.');
    }
    if (scenario === 'empty') {
      return { ingredients: [], isDemo: false };
    }
    return { ingredients: FRIDGE_INGREDIENTS_MOCK, isDemo: false };
  },
};
