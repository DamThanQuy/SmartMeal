import type { MetaItem } from '../types/health.api.types';

// Quy đổi slug FE (ALLERGY_OPTIONS/HEALTH_CONDITION_OPTIONS/RECIPE_TAG_OPTIONS) ↔ id int của
// backend (/meta/*). id cố định do `HasData` seed trong ApplicationDbContext (docs/fetch-api/part1
// §6.4). Slug không có trong bảng (treeNut, sesame, other, lowCarb, vegetarian...) không có
// tương đương trên BE — giữ cục bộ, KHÔNG gửi lên.
//
// AN TOÀN: gửi sai id nghĩa là lưu sai dị ứng của người dùng. Nếu DB bị seed lại, dùng
// verifyMetaMapping() để đối chiếu với dữ liệu thật từ /meta/*.

export const ALLERGY_META_ID_BY_SLUG: Readonly<Record<string, number>> = {
  seafood: 1,
  peanut: 2,
  dairy: 3,
  egg: 4,
  gluten: 5,
  soy: 6,
};

export const CONDITION_META_ID_BY_SLUG: Readonly<Record<string, number>> = {
  diabetes: 1,
  gout: 2,
  hypertension: 3,
};

export const TAG_META_ID_BY_SLUG: Readonly<Record<string, number>> = {
  eatClean: 1,
  keto: 2,
  vegan: 3,
  quick: 5,
};

function invert(table: Readonly<Record<string, number>>): ReadonlyMap<number, string> {
  return new Map(Object.entries(table).map(([slug, id]) => [id, slug]));
}

const ALLERGY_SLUG_BY_META_ID = invert(ALLERGY_META_ID_BY_SLUG);
const CONDITION_SLUG_BY_META_ID = invert(CONDITION_META_ID_BY_SLUG);
const TAG_SLUG_BY_META_ID = invert(TAG_META_ID_BY_SLUG);

export function allergySlugFromMetaId(id: number): string | undefined {
  return ALLERGY_SLUG_BY_META_ID.get(id);
}

export function conditionSlugFromMetaId(id: number): string | undefined {
  return CONDITION_SLUG_BY_META_ID.get(id);
}

export function tagSlugFromMetaId(id: number): string | undefined {
  return TAG_SLUG_BY_META_ID.get(id);
}

/** Slug có id trên BE không (false → dữ liệu chỉ giữ cục bộ, vd. 'treeNut'). */
export function hasAllergyMetaId(slug: string): boolean {
  return slug in ALLERGY_META_ID_BY_SLUG;
}

export function hasConditionMetaId(slug: string): boolean {
  return slug in CONDITION_META_ID_BY_SLUG;
}

/** Quy đổi danh sách slug → id BE, bỏ slug không có id và loại trùng. */
export function toMetaIds(slugs: readonly string[], table: Readonly<Record<string, number>>): number[] {
  const ids = slugs.map(slug => table[slug]).filter((id): id is number => id !== undefined);
  return Array.from(new Set(ids));
}

// `GET /healthprofile` trả TÊN (vd. "Hải sản (Seafood)"), không trả id → đối chiếu theo từ khóa
// (không phân biệt hoa/thường, cả tiếng Việt lẫn tiếng Anh) để không phụ thuộc cách viết chính xác.
const ALLERGY_NAME_KEYWORDS: readonly (readonly [string, readonly string[]])[] = [
  ['seafood', ['seafood', 'hải sản']],
  ['peanut', ['peanut', 'đậu phộng']],
  ['dairy', ['dairy', 'sữa']],
  ['egg', ['egg', 'trứng']],
  ['gluten', ['gluten', 'lúa mì']],
  ['soy', ['soy', 'đậu nành']],
];

const CONDITION_NAME_KEYWORDS: readonly (readonly [string, readonly string[]])[] = [
  ['diabetes', ['diabetes', 'tiểu đường']],
  ['gout', ['gout']],
  ['hypertension', ['hypertension', 'cao huyết áp']],
];

function slugFromName(
  name: string,
  keywordTable: readonly (readonly [string, readonly string[]])[],
): string | undefined {
  const normalized = name.trim().toLowerCase();
  return keywordTable.find(([, keywords]) =>
    keywords.some(keyword => normalized.includes(keyword)),
  )?.[0];
}

export function allergySlugFromName(name: string): string | undefined {
  return slugFromName(name, ALLERGY_NAME_KEYWORDS);
}

export function conditionSlugFromName(name: string): string | undefined {
  return slugFromName(name, CONDITION_NAME_KEYWORDS);
}

/**
 * Đối chiếu bảng id cứng ở trên với dữ liệu thật từ /meta/allergies, /meta/medical-conditions.
 * Trả danh sách mô tả chỗ lệch (rỗng = khớp) — gọi trong dev/test, không chặn luồng chạy.
 */
export function verifyMetaMapping(
  allergies: readonly MetaItem[],
  conditions: readonly MetaItem[],
): string[] {
  const problems: string[] = [];

  const check = (
    kind: string,
    table: Readonly<Record<string, number>>,
    items: readonly MetaItem[],
    slugFromItemName: (name: string) => string | undefined,
  ) => {
    Object.entries(table).forEach(([slug, id]) => {
      const item = items.find(candidate => candidate.id === id);
      if (!item) {
        problems.push(`${kind}: không có id ${id} (slug "${slug}") trên BE`);
      } else if (slugFromItemName(item.name) !== slug) {
        problems.push(`${kind}: id ${id} là "${item.name}", không khớp slug "${slug}"`);
      }
    });
  };

  check('allergy', ALLERGY_META_ID_BY_SLUG, allergies, allergySlugFromName);
  check('condition', CONDITION_META_ID_BY_SLUG, conditions, conditionSlugFromName);
  return problems;
}
