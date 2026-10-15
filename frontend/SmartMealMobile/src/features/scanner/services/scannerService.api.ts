import { API_CONFIG } from '@/config/api';
import { getMetaCatalog } from '@/features/health';
import { api, ENDPOINTS, isApiError } from '@/services/api';
import type { CheckSafetyRequestDto, CheckSafetyResponseDto, FridgeScannerResponseDto } from '../types/scanner.api.types';
import type { FridgeScanResult, OcrReviewResult, ScannedProduct } from '../types/scanner.types';
import { fromBarcodeCheck, fromLabelScan, toFridgeIngredients } from './scanner.mapper';

// Bản gọi backend thật cho scanner. Mọi kết quả đến từ server: mã vạch tra trong CSDL (không đoán),
// nhãn đọc từ ẢNH người dùng chụp, tủ lạnh nhận diện từ ảnh thật — không có giá trị mặc định hay ảnh
// mẫu (review PR #9 S1–S3).

function imageForm(uri: string, name: string): FormData {
  const form = new FormData();
  // React Native FormData nhận { uri, name, type } cho file trên máy.
  form.append('image', { uri, name, type: 'image/jpeg' } as unknown as Blob);
  return form;
}

export const scannerApiService = {
  // POST /ai/check-safety { barcode } — sản phẩm + dinh dưỡng /100 g + cảnh báo theo hồ sơ (BR-120/140).
  // 404 product_not_found → null để màn chuyển sang ProductNotFound (nhập tay hoặc quét nhãn).
  async scanBarcode(code: string): Promise<ScannedProduct | null> {
    try {
      const [dto, catalog] = await Promise.all([
        api.post<CheckSafetyResponseDto, CheckSafetyRequestDto>(ENDPOINTS.ai.checkSafety, { barcode: code }),
        getMetaCatalog(),
      ]);
      return fromBarcodeCheck(code, dto, catalog);
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') return null;
      throw error;
    }
  },

  // POST /ai/scan-label (multipart image) — AI đọc nhãn, server bổ sung cảnh báo bằng code (BR-130/140).
  async analyzeOcrLabel(imageUri: string): Promise<OcrReviewResult> {
    const dto = await api.post<CheckSafetyResponseDto, FormData>(ENDPOINTS.ai.scanLabel, imageForm(imageUri, 'label.jpg'), {
      timeout: API_CONFIG.aiTimeout,
    });
    return fromLabelScan(dto);
  },

  // POST /ai/fridge-scanner — BE nhận 1 ảnh/request: gửi tuần tự từng ảnh rồi gộp nguyên liệu.
  async scanFridge(imageUris: string[]): Promise<FridgeScanResult> {
    if (imageUris.length === 0) throw new Error('Hãy chụp ít nhất một ảnh tủ lạnh.');
    const names: string[] = [];
    let isDemo = false;
    for (const [index, uri] of imageUris.entries()) {
      const dto = await api.post<FridgeScannerResponseDto, FormData>(
        ENDPOINTS.ai.fridgeScanner,
        imageForm(uri, `fridge-${index + 1}.jpg`),
        { timeout: API_CONFIG.aiTimeout },
      );
      names.push(...dto.detectedIngredients);
      isDemo = isDemo || dto.isDemo;
    }
    return { ingredients: toFridgeIngredients(names), isDemo };
  },
};
