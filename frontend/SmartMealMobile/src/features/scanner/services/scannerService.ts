import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { FRIDGE_INGREDIENTS_MOCK } from '../mocks/fridge.mock';
import { OCR_REVIEW_RESULT_MOCK } from '../mocks/ocr.mock';
import { SCANNED_PRODUCT_MOCK } from '../mocks/products.mock';
import type { FridgeIngredient, OcrReviewResult, ScannedProduct } from '../types/scanner.types';

// TODO: replace mock with real API — camera/OCR/Vision thật (expo-camera) chưa nối, chỉ có nút
// "giả lập quét" (CLAUDE.md mục 8, docs/ui-mock-prompts.md Phase 4).

/** design/StatePermission.dc.html — mô phỏng quyền camera bị từ chối qua MOCK_SCENARIO='error'. */
export class CameraPermissionDeniedError extends Error {}

export const scannerService = {
  // BR-120 — Barcode Scanner: có sản phẩm trả về, chưa có trả null (ProductNotFound).
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

  // BR-130 — OCR Nutrition Label.
  async analyzeOcrLabel(): Promise<OcrReviewResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new CameraPermissionDeniedError('SmartMeal cần quyền dùng camera.');
    }
    return OCR_REVIEW_RESULT_MOCK;
  },

  // BR-080 — Fridge Scanner.
  async scanFridge(): Promise<FridgeIngredient[]> {
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
