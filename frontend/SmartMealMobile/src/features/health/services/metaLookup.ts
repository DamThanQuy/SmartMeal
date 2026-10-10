import type { MetaItem } from '../types/health.api.types';

// Phần thuần của danh mục /meta/*: ánh xạ slug FE ↔ id BE theo MÃ (code). FE dùng slug cố định
// ("seafood", "diabetes", "eatClean"…) trùng `code` của BE, còn BE nhận/trả id int. Không hard-code
// id nên DB seed lại hay thêm mục mới cũng không gửi nhầm id — gửi sai id nghĩa là lưu sai dị ứng/
// bệnh lý của người dùng (docs/fetch-api/part1 §6.4). Việc tải danh mục nằm ở metaCatalog.ts.

export interface MetaLookup {
  /** id BE của một slug; undefined nếu BE không có mục đó (vd. "other"). */
  idByCode: (code: string) => number | undefined;
  /** slug của một id BE; undefined nếu id lạ. */
  codeById: (id: number) => string | undefined;
  /** Slug có tương đương trên BE không (false → chỉ giữ cục bộ). */
  hasCode: (code: string) => boolean;
}

export interface MetaCatalog {
  allergies: MetaLookup;
  conditions: MetaLookup;
  tags: MetaLookup;
}

export function createMetaLookup(items: readonly MetaItem[]): MetaLookup {
  const idByCode = new Map(items.map(item => [item.code, item.id]));
  const codeById = new Map(items.map(item => [item.id, item.code]));
  return {
    idByCode: code => idByCode.get(code),
    codeById: id => codeById.get(id),
    hasCode: code => idByCode.has(code),
  };
}

/** Quy đổi danh sách slug → id BE: bỏ slug BE không có và loại trùng. */
export function toMetaIds(slugs: readonly string[] | undefined | null, lookup: MetaLookup): number[] {
  if (!slugs) return [];
  const ids = slugs
    .map(slug => lookup.idByCode(slug))
    .filter((id): id is number => id !== undefined);
  return Array.from(new Set(ids));
}

/** Quy đổi danh sách id BE → slug: bỏ id lạ và loại trùng. */
export function toMetaCodes(ids: readonly number[] | undefined | null, lookup: MetaLookup): string[] {
  if (!ids) return [];
  const codes = ids
    .map(id => lookup.codeById(id))
    .filter((code): code is string => code !== undefined);
  return Array.from(new Set(codes));
}

