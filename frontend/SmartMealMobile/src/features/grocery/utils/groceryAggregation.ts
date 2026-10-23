// BR-172 — nhóm nguyên liệu theo loại. Thứ tự cũng là thứ tự hiển thị (design/Grocery.dc.html,
// GroceryAdd.dc.html). Là nguồn DUY NHẤT cho cả phân loại nguyên liệu từ Meal Plan
// (categorizeIngredient) và chip chọn nhóm ở GroceryAddScreen — không hard-code lại ở screen nào.
export const GROCERY_CATEGORY_ORDER = [
  'Rau củ',
  'Thịt cá',
  'Sữa',
  'Ngũ cốc',
  'Gia vị',
  'Đồ khô',
] as const;
export type GroceryCategory = (typeof GROCERY_CATEGORY_ORDER)[number];

// Từ khóa gồm cả nguyên liệu seed của backend (cá hồi, ớt chuông, dưa leo, sốt mè…) để món sinh từ
// thực đơn thật không rơi hết vào "Đồ khô". Trái cây xếp chung "Rau củ" (quầy rau quả); nhóm này xét trước
// "Gia vị" nên "Chuối tiêu" không bị xếp nhầm vì chữ "tiêu".
const CATEGORY_KEYWORDS: { category: GroceryCategory; keywords: string[] }[] = [
  {
    category: 'Rau củ',
    keywords: [
      'cà chua', 'xà lách', 'bông cải', 'cà rốt', 'bí đỏ', 'hành tây', 'dưa leo', 'ớt chuông', 'măng tây', 'rau', 'nấm',
      'chuối', 'táo', 'xoài', 'dâu tây',
    ],
  },
  { category: 'Thịt cá', keywords: ['ức gà', 'thịt', 'đậu hũ', 'trứng', 'cá hồi', 'cá basa', 'cá thu', 'cá ngừ', 'cá lóc', 'tôm', 'mực'] },
  { category: 'Sữa', keywords: ['sữa tươi', 'sữa chua', 'kem tươi', 'phô mai', 'sữa'] },
  { category: 'Ngũ cốc', keywords: ['yến mạch', 'gạo', 'bánh mì', 'bún', 'mì'] },
  {
    category: 'Gia vị',
    keywords: ['tỏi', 'hành lá', 'hành tím', 'muối', 'tiêu', 'dầu ô liu', 'dầu hào', 'chanh', 'sốt', 'mè', 'nước mắm', 'nước tương'],
  },
  { category: 'Đồ khô', keywords: ['mật ong'] },
];

// BR-172 — không có category rõ ràng rơi vào 'Đồ khô' (nhóm tạp hoá/pantry tổng quát) thay vì
// đoán sai loại — thay cho 'Khác' cũ (design v2 không còn liệt kê nhóm này).
export function categorizeIngredient(name: string): GroceryCategory {
  const normalized = name.toLowerCase();
  const match = CATEGORY_KEYWORDS.find(rule =>
    rule.keywords.some(keyword => normalized.includes(keyword)),
  );
  return match?.category ?? 'Đồ khô';
}

export type ParsedUnitKind = 'g' | 'ml' | 'piece';

export interface ParsedAmount {
  quantity: number;
  /** Với 'piece', unitLabel giữ nguyên đơn vị gốc (quả, củ, tép, cây...) để hiển thị đúng. */
  unitKind: ParsedUnitKind;
  unitLabel: string;
}

// design/GroceryAdd.dc.html — chip đơn vị (g/kg/ml/quả/bó/gói...) nhập tay: số lượng + đơn vị đã tách
// sẵn theo form.
export function manualQuantityToParsedAmount(quantity: number, unit: string): ParsedAmount {
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === 'g') return { quantity, unitKind: 'g', unitLabel: 'g' };
  if (normalizedUnit === 'kg') return { quantity: quantity * 1000, unitKind: 'g', unitLabel: 'g' };
  if (normalizedUnit === 'ml') return { quantity, unitKind: 'ml', unitLabel: 'ml' };
  if (normalizedUnit === 'l') return { quantity: quantity * 1000, unitKind: 'ml', unitLabel: 'ml' };
  return { quantity, unitKind: 'piece', unitLabel: unit };
}

interface PriceRule {
  keywords: string[];
  pricePerGram?: number;
  pricePerMl?: number;
  pricePerPiece?: number;
}

// BR-174 — "giá trung bình" minh hoạ (VNĐ), KHÔNG phải giá thị trường thật.
const PRICE_RULES: PriceRule[] = [
  { keywords: ['thịt bò'], pricePerGram: 280 },
  { keywords: ['cá basa'], pricePerGram: 90 },
  { keywords: ['ức gà'], pricePerGram: 70 },
  { keywords: ['đậu hũ'], pricePerGram: 25 },
  { keywords: ['yến mạch'], pricePerGram: 45 },
  { keywords: ['bí đỏ', 'bông cải', 'cà rốt'], pricePerGram: 12 },
  { keywords: ['kem tươi'], pricePerMl: 60 },
  { keywords: ['sữa tươi'], pricePerMl: 18 },
  { keywords: ['trứng'], pricePerPiece: 3500 },
  { keywords: ['chuối'], pricePerPiece: 4000 },
  { keywords: ['cà chua bi'], pricePerPiece: 1000 },
  { keywords: ['cà chua'], pricePerPiece: 3000 },
  { keywords: ['xà lách'], pricePerPiece: 10000 },
  { keywords: ['hành tây'], pricePerPiece: 6000 },
  { keywords: ['cà rốt'], pricePerPiece: 5000 },
  { keywords: ['tỏi'], pricePerPiece: 2000 },
  { keywords: ['sữa chua'], pricePerPiece: 7000 },
  { keywords: ['dầu ô liu', 'dầu hào'], pricePerPiece: 45000 },
  { keywords: ['mật ong'], pricePerPiece: 35000 },
  { keywords: ['muối', 'tiêu'], pricePerPiece: 12000 },
];

const DEFAULT_PRICE_PER_GRAM = 20;
const DEFAULT_PRICE_PER_ML = 20;
const DEFAULT_PRICE_PER_PIECE = 8000;
/** Nguyên liệu không parse được số lượng (vd. "Vừa đủ") — ước tính tối thiểu. */
const UNPARSEABLE_FLAT_COST_VND = 5000;

export function estimateItemCostVnd(name: string, parsed: ParsedAmount | null): number {
  if (!parsed) return UNPARSEABLE_FLAT_COST_VND;

  const normalized = name.toLowerCase();
  const rule = PRICE_RULES.find(candidate =>
    candidate.keywords.some(keyword => normalized.includes(keyword)),
  );

  const rawCost =
    parsed.unitKind === 'g'
      ? parsed.quantity * (rule?.pricePerGram ?? DEFAULT_PRICE_PER_GRAM)
      : parsed.unitKind === 'ml'
      ? parsed.quantity * (rule?.pricePerMl ?? DEFAULT_PRICE_PER_ML)
      : parsed.quantity * (rule?.pricePerPiece ?? DEFAULT_PRICE_PER_PIECE);

  return Math.round(rawCost / 1000) * 1000;
}
