import type { ScannedProduct } from '../types/scanner.types';

// design/Barcode.dc.html, ProductNotFound.dc.html — mock lookup table theo mã vạch.
export const SCANNED_PRODUCT_MOCK: ScannedProduct = {
  id: 'banh-quy-bo-dau-phong',
  barcode: '8934500123456',
  name: 'Bánh quy bơ đậu phộng',
  packageLabel: 'Gói 100 g · Dữ liệu sản phẩm',
  nutritionPer100g: {
    calories: 480,
    proteinG: 8,
    carbsG: 62,
    fatG: 22,
    sugarG: 28,
    sodiumMg: 320,
  },
  allergenIds: ['peanut'],
  sugarWarningThreshold: 20,
};

/** Mã vạch dùng để minh hoạ ProductNotFound.dc.html — chưa có trong "database". */
export const UNKNOWN_BARCODE_MOCK = '8934563123456';
