import type { MetaItem } from '../types/health.api.types';

// Bản giả lập danh mục /meta/* (EXPO_PUBLIC_USE_MOCK_API=true) — khớp dữ liệu `HasData` của
// ApplicationDbContext để bảng quy đổi trong utils/metaMapping.ts vẫn đối chiếu đúng.
// TODO: replace mock with real API — bản thật nằm ở metaService.api.ts.

const ALLERGIES: MetaItem[] = [
  { id: 1, name: 'Hải sản (Seafood)', description: 'Tôm, cua, ốc, mực' },
  { id: 2, name: 'Đậu phộng (Peanuts)', description: 'Lạc và chế phẩm từ lạc' },
  { id: 3, name: 'Sữa động vật (Dairy)', description: 'Sữa bò, phô mai, bơ' },
  { id: 4, name: 'Trứng (Eggs)', description: 'Trứng gà, trứng vịt' },
  { id: 5, name: 'Gluten (Lúa mì)', description: 'Bánh mì, mì ý bột mì' },
  { id: 6, name: 'Đậu nành (Soy)', description: 'Đậu phụ, sữa đậu nành' },
];

const MEDICAL_CONDITIONS: MetaItem[] = [
  { id: 1, name: 'Tiểu đường (Diabetes)', description: 'Hạn chế đường và carbs hấp thu nhanh' },
  {
    id: 2,
    name: 'Gout (Axit Uric cao)',
    description: 'Hạn chế purin (nội tạng, thịt đỏ, hải sản)',
  },
  {
    id: 3,
    name: 'Cao huyết áp (Hypertension)',
    description: 'Chế độ ăn giảm muối Natri (DASH)',
  },
  {
    id: 4,
    name: 'Mỡ máu cao (Dyslipidemia)',
    description: 'Hạn chế mỡ bão hòa và cholesterol',
  },
];

const TAGS: MetaItem[] = [
  { id: 1, name: 'Eat Clean' },
  { id: 2, name: 'Keto' },
  { id: 3, name: 'Thuần Chay (Vegan)' },
  { id: 4, name: 'Tăng Cơ (High Protein)' },
  { id: 5, name: 'Nhanh Gọn (< 15 phút)' },
  { id: 6, name: 'Tiết Kiệm Ngân Sách' },
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
