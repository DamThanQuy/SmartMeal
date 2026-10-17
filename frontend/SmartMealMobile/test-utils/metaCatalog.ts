import type { MetaItem } from '@/features/health/types/health.api.types';
import { createMetaLookup, type MetaCatalog } from '@/features/health/services/metaLookup';

// Danh mục /meta/* khớp dữ liệu seed của backend (id + code).
const ALLERGIES: MetaItem[] = [
  { id: 1, code: 'seafood', name: 'Hải sản (Seafood)', description: 'Tôm, cua, ốc, mực' },
  { id: 2, code: 'peanut', name: 'Đậu phộng (Peanuts)', description: 'Lạc và chế phẩm từ lạc' },
  { id: 3, code: 'dairy', name: 'Sữa động vật (Dairy)', description: 'Sữa bò, phô mai, bơ' },
  { id: 4, code: 'egg', name: 'Trứng (Eggs)', description: 'Trứng gà, trứng vịt' },
  { id: 5, code: 'gluten', name: 'Gluten (Lúa mì)', description: 'Bánh mì, mì ý bột mì' },
  { id: 6, code: 'soy', name: 'Đậu nành (Soy)', description: 'Đậu phụ, sữa đậu nành' },
  {
    id: 7,
    code: 'treeNut',
    name: 'Các loại hạt (Tree nuts)',
    description: 'Hạnh nhân, óc chó, hạt điều, hạt dẻ',
  },
  { id: 8, code: 'sesame', name: 'Mè (Sesame)', description: 'Hạt mè, dầu mè, sốt mè' },
];

const MEDICAL_CONDITIONS: MetaItem[] = [
  {
    id: 1,
    code: 'diabetes',
    name: 'Tiểu đường (Diabetes)',
    description: 'Hạn chế đường và carbs hấp thu nhanh',
  },
  {
    id: 2,
    code: 'gout',
    name: 'Gout (Axit Uric cao)',
    description: 'Hạn chế purin (nội tạng, thịt đỏ, hải sản)',
  },
  {
    id: 3,
    code: 'hypertension',
    name: 'Cao huyết áp (Hypertension)',
    description: 'Chế độ ăn giảm muối Natri (DASH)',
  },
  {
    id: 4,
    code: 'dyslipidemia',
    name: 'Mỡ máu cao (Dyslipidemia)',
    description: 'Hạn chế mỡ bão hòa và cholesterol',
  },
];

const TAGS: MetaItem[] = [
  { id: 1, code: 'eatClean', name: 'Eat Clean' },
  { id: 2, code: 'keto', name: 'Keto' },
  { id: 3, code: 'vegan', name: 'Thuần Chay (Vegan)' },
  { id: 4, code: 'highProtein', name: 'Tăng Cơ (High Protein)' },
  { id: 5, code: 'quick', name: 'Nhanh Gọn (< 15 phút)' },
  { id: 6, code: 'budget', name: 'Tiết Kiệm Ngân Sách' },
  { id: 7, code: 'lowCarb', name: 'Low-Carb' },
  { id: 8, code: 'vegetarian', name: 'Ăn Chay (Vegetarian)' },
];

/**
 * Danh mục /meta/* theo code (khớp seed của backend). Dùng cho test cần ánh xạ slug FE ↔ id BE mà không
 * gọi mạng. Đặt ngoài __tests__ để Jest không coi là file test.
 */
export async function createTestCatalog(): Promise<MetaCatalog> {
  return {
    allergies: createMetaLookup(ALLERGIES),
    conditions: createMetaLookup(MEDICAL_CONDITIONS),
    tags: createMetaLookup(TAGS),
  };
}
