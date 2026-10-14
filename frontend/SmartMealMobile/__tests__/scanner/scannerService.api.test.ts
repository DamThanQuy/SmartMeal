import { createMetaLookup } from '@/features/health/services/metaLookup';
import type { CheckSafetyResponseDto } from '@/features/scanner/types/scanner.api.types';

const catalog = {
  allergies: createMetaLookup([
    { id: 1, code: 'peanut', name: 'Đậu phộng' },
    { id: 2, code: 'milk', name: 'Sữa' },
  ]),
  conditions: createMetaLookup([]),
  tags: createMetaLookup([]),
};

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };
  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
  }));
  jest.doMock('@/features/health', () => ({ getMetaCatalog: jest.fn().mockResolvedValue(catalog) }));

  const module =
    require('@/features/scanner/services/scannerService.api') as typeof import('@/features/scanner/services/scannerService.api');
  const errors = jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return { service: module.scannerApiService, apiMock, ApiError: errors.ApiError };
}

const baseResponse: CheckSafetyResponseDto = {
  isSafe: true,
  alerts: [],
  detectedIngredients: [],
  extractedNutrition: null,
  isDemo: false,
  source: 'database',
  product: null,
  productName: null,
  ocrText: null,
};

describe('scannerService.api', () => {
  test('scanBarcode gửi { barcode } tới /ai/check-safety và map sản phẩm + cảnh báo', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({
      ...baseResponse,
      isSafe: false,
      alerts: [
        { type: 'HIGH_SUGAR', message: 'Đường cao', severity: 'WARNING' },
        { type: 'ALLERGEN', message: 'Chứa đậu phộng', severity: 'DANGER' },
      ],
      extractedNutrition: {
        caloriesPerServing: 520.44,
        servingSize: '100 g',
        sugarGrams: 30,
        sodiumMg: 120,
        totalFatGrams: 25,
        proteinGrams: 10,
        carbsGrams: 60,
        servingGrams: 100,
        basis: 'per100g',
      },
      product: {
        foodId: 'food-1',
        name: 'Bánh quy bơ đậu phộng',
        barcode: '8934563138165',
        isVerified: false,
        isUserCreated: true,
        allergyIds: [1, 99],
        matchedAllergyIds: [1],
      },
    } satisfies CheckSafetyResponseDto);

    const product = await service.scanBarcode?.('8934563138165');

    expect(apiMock.post).toHaveBeenCalledWith('/ai/check-safety', { barcode: '8934563138165' });
    expect(product).toMatchObject({
      id: 'food-1',
      barcode: '8934563138165',
      isVerified: false,
      allergenIds: ['peanut'],
      nutritionPer100g: { calories: 520.4, proteinG: 10, carbsG: 60, fatG: 25, sugarG: 30, sodiumMg: 120 },
    });
    // Nguy hiểm (dị ứng) xếp trước cảnh báo dinh dưỡng.
    expect(product?.alerts.map(alert => alert.severity)).toEqual(['danger', 'warning']);
  });

  test('scanBarcode trả null khi server không có sản phẩm (404) — không bịa sản phẩm mặc định', async () => {
    const { service, apiMock, ApiError } = loadService();
    apiMock.post.mockRejectedValue(new ApiError('Không tìm thấy', 'NOT_FOUND', 404));

    await expect(service.scanBarcode?.('0000000000000')).resolves.toBeNull();
  });

  test('scanBarcode ném lại lỗi khác 404', async () => {
    const { service, apiMock, ApiError } = loadService();
    apiMock.post.mockRejectedValue(new ApiError('Lỗi mạng', 'NETWORK'));

    await expect(service.scanBarcode?.('8934563138165')).rejects.toThrow('Lỗi mạng');
  });

  test('analyzeOcrLabel gửi ảnh multipart tới /ai/scan-label; trường nhãn không ghi để trống', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({
      ...baseResponse,
      source: 'ai',
      productName: ' Sữa chua ',
      detectedIngredients: ['sữa'],
      extractedNutrition: {
        caloriesPerServing: 95,
        servingSize: '1 hộp (100 g)',
        sugarGrams: 12,
        sodiumMg: 50,
        totalFatGrams: 3,
        proteinGrams: null,
        carbsGrams: 14,
        servingGrams: null,
        basis: 'perServing',
      },
    } satisfies CheckSafetyResponseDto);

    const result = await service.analyzeOcrLabel?.('file:///label.jpg');

    const [url, form] = apiMock.post.mock.calls[0] as [string, FormData];
    expect(url).toBe('/ai/scan-label');
    expect(form).toBeInstanceOf(FormData);
    expect(result?.productName).toBe('Sữa chua');
    expect(result?.servingLabel).toBe('1 hộp (100 g)');
    expect(result?.fields.find(item => item.label === 'Protein')).toMatchObject({ value: '', isUncertain: true });
    expect(result?.fields.find(item => item.label === 'Khẩu phần')).toMatchObject({ value: '', isUncertain: true });
    expect(result?.fields.find(item => item.label === 'Calo')).toMatchObject({ value: '95' });
    expect(result?.isDemo).toBe(false);
  });

  test('scanFridge gửi từng ảnh, gộp nguyên liệu bỏ trùng, mọi món chờ xác nhận', async () => {
    const { service, apiMock } = loadService();
    apiMock.post
      .mockResolvedValueOnce({ detectedIngredients: ['Cà chua', 'Trứng gà'], suggestedRecipes: [], isDemo: false })
      .mockResolvedValueOnce({ detectedIngredients: ['trứng gà', ' Bơ '], suggestedRecipes: [], isDemo: true });

    const result = await service.scanFridge?.(['file:///a.jpg', 'file:///b.jpg']);

    expect(apiMock.post).toHaveBeenCalledTimes(2);
    expect(apiMock.post.mock.calls.every(([url]) => url === '/ai/fridge-scanner')).toBe(true);
    expect(result?.ingredients.map(item => item.name)).toEqual(['Cà chua', 'Trứng gà', 'Bơ']);
    expect(result?.ingredients.every(item => item.status === 'uncertain')).toBe(true);
    expect(result?.isDemo).toBe(true);
  });

  test('scanFridge không có ảnh thì báo lỗi, không gửi ảnh mẫu', async () => {
    const { service, apiMock } = loadService();

    await expect(service.scanFridge?.([])).rejects.toThrow();
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});
