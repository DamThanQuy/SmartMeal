import type { MetaItem } from '../types/health.api.types';

// Bản giả lập danh mục /meta/* (EXPO_PUBLIC_USE_MOCK_API=true) — khớp dữ liệu seed của backend
// (id + code) để mọi ánh xạ theo code chạy giống khi gọi API thật.
// TODO: replace mock with real API — bản thật nằm ở metaService.api.ts.

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

export const metaMockService = {
  async getAllergies(): Promise<MetaItem[]> {
    return ALLERGIES;
  },
  async getMedicalConditions(): Promise<MetaItem[]> {
    return MEDICAL_CONDITIONS;
  },
  async getTags(): Promise<MetaItem[]> {
    return TAGS;
  },
};
