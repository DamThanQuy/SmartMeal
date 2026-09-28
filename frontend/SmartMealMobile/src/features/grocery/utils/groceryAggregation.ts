// BR-172 — nhóm nguyên liệu theo loại. Thứ tự cũng là thứ tự hiển thị (design/Grocery.dc.html).
export const GROCERY_CATEGORY_ORDER = ['Rau củ', 'Thịt cá', 'Sữa', 'Gia vị', 'Khác'] as const;
export type GroceryCategory = (typeof GROCERY_CATEGORY_ORDER)[number];

const CATEGORY_KEYWORDS: { category: GroceryCategory; keywords: string[] }[] = [
  { category: 'Rau củ', keywords: ['cà chua', 'xà lách', 'bông cải', 'cà rốt', 'bí đỏ', 'hành tây'] },
  { category: 'Thịt cá', keywords: ['ức gà', 'thịt bò', 'đậu hũ', 'trứng', 'cá basa'] },
  { category: 'Sữa', keywords: ['sữa tươi', 'sữa chua', 'kem tươi', 'sữa'] },
  {
    category: 'Gia vị',
    keywords: ['tỏi', 'hành lá', 'muối', 'tiêu', 'dầu ô liu', 'dầu hào', 'chanh', 'mật ong'],
  },
];

// BR-172 — không có category rõ ràng (yến mạch, chuối...) rơi vào 'Khác' thay vì đoán sai loại.
export function categorizeIngredient(name: string): GroceryCategory {
  const normalized = name.toLowerCase();
  const match = CATEGORY_KEYWORDS.find(rule =>
    rule.keywords.some(keyword => normalized.includes(keyword)),
  );
  return match?.category ?? 'Khác';
}

export type ParsedUnitKind = 'g' | 'ml' | 'piece';

export interface ParsedAmount {
  quantity: number;
  /** Với 'piece', unitLabel giữ nguyên đơn vị gốc (quả, củ, tép, cây...) để hiển thị đúng. */
  unitKind: ParsedUnitKind;
  unitLabel: string;
}

// "300 g" → {quantity:300, unitKind:'g'}. "1 củ" → {quantity:1, unitKind:'piece', unitLabel:'củ'}.
// "Vừa đủ" → null (không cộng dồn được, chỉ hiển thị nguyên văn — BR-171 chỉ áp dụng khi có số).
export function parseIngredientAmount(amount: string): ParsedAmount | null {
  const match = amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return null;

  const quantity = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(quantity)) return null;

  const unitText = match[2].trim();
  const firstToken = unitText.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (firstToken === 'g') return { quantity, unitKind: 'g', unitLabel: 'g' };
  if (firstToken === 'kg') return { quantity: quantity * 1000, unitKind: 'g', unitLabel: 'g' };
  if (firstToken === 'ml') return { quantity, unitKind: 'ml', unitLabel: 'ml' };
  if (firstToken === 'l') return { quantity: quantity * 1000, unitKind: 'ml', unitLabel: 'ml' };
  return { quantity, unitKind: 'piece', unitLabel: unitText || 'phần' };
}

export function formatAmountLabel(quantity: number, unitKind: ParsedUnitKind, unitLabel: string): string {
  const roundedQuantity = unitKind === 'piece' ? quantity : Math.round(quantity);
  const quantityLabel = Number.isInteger(roundedQuantity)
    ? String(roundedQuantity)
    : roundedQuantity.toLocaleString('vi-VN');
  return `${quantityLabel} ${unitLabel}`;
}

interface PriceRule {
  keywords: string[];
  pricePerGram?: number;
  pricePerMl?: number;
  pricePerPiece?: number;
}

// BR-174 — "giá trung bình" mock minh hoạ (VNĐ), KHÔNG phải giá thị trường thật.
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
