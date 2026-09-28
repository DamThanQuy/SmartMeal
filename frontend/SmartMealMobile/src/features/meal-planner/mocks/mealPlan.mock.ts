import type { MealType } from '@/types/meal.types';

/** dayOffset: 0 = Thứ 2 ... 6 = Chủ nhật. Chỉ set Sáng/Trưa/Tối mẫu — Phụ luôn để trống
 * ("Thêm món") giống design/MealPlanner.dc.html. Chủ nhật khớp đúng design (Sáng: Yến mạch
 * chuối, Trưa: Gà áp chảo rau củ, Tối/Phụ trống). */
export const WEEK_PLAN_TEMPLATE: Record<number, Partial<Record<MealType, string>>> = {
  0: { breakfast: 'yen-mach-chuoi', lunch: 'ga-ap-chao-rau-cu', dinner: 'dau-hu-sot-ca-chua' },
  1: { breakfast: 'salad-trung', lunch: 'bo-xao-bong-cai', dinner: 'sup-bi-do-kem-tuoi' },
  2: { breakfast: 'yen-mach-chuoi', lunch: 'salad-uc-ga', dinner: 'trung-xao-ca-chua' },
  3: { breakfast: 'salad-trung', lunch: 'ga-ap-chao-rau-cu' },
  4: { breakfast: 'yen-mach-chuoi', lunch: 'dau-hu-sot-ca-chua', dinner: 'bo-xao-bong-cai' },
  5: { lunch: 'salad-uc-ga', dinner: 'sup-bi-do-kem-tuoi' },
  6: { breakfast: 'yen-mach-chuoi', lunch: 'ga-ap-chao-rau-cu' },
};
