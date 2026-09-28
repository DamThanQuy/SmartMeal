import type { FridgeIngredient } from '../types/scanner.types';

// design/Fridge.dc.html — 3 nguyên liệu chắc chắn + 1 nguyên liệu "chưa chắc chắn" cần user
// xác nhận trước khi tính vào gợi ý món (docs/ui-mock-prompts.md Phase 4).
export const FRIDGE_INGREDIENTS_MOCK: FridgeIngredient[] = [
  { id: 'egg', name: 'Trứng', quantityLabel: 'Khoảng 6 quả', status: 'confirmed' },
  { id: 'tomato', name: 'Cà chua', quantityLabel: 'Khoảng 3 quả', status: 'confirmed' },
  { id: 'lettuce', name: 'Xà lách', quantityLabel: '1 cây', status: 'confirmed' },
  { id: 'chicken', name: 'Thịt gà', quantityLabel: 'Chưa chắc chắn · xác nhận?', status: 'uncertain' },
];
