/**
 * metaMapping (docs/fetch-api/part1 §6.4): bảng slug FE ↔ id int của BE. Gửi sai id nghĩa là lưu
 * sai dị ứng/bệnh lý của người dùng nên bảng phải khớp dữ liệu seed thật của backend.
 */
import { metaMockService } from '@/features/health/services/metaService.mock';
import type { MetaItem } from '@/features/health/types/health.api.types';
import {
  ALLERGY_META_ID_BY_SLUG,
  CONDITION_META_ID_BY_SLUG,
  TAG_META_ID_BY_SLUG,
  allergySlugFromMetaId,
  allergySlugFromName,
  conditionSlugFromMetaId,
  conditionSlugFromName,
  hasAllergyMetaId,
  hasConditionMetaId,
  tagSlugFromMetaId,
  toMetaIds,
  verifyMetaMapping,
} from '@/features/health/utils/metaMapping';

// Tên đúng như `HasData` trong ApplicationDbContext.cs.
const BE_ALLERGIES: MetaItem[] = [
  { id: 1, name: 'Hải sản (Seafood)' },
  { id: 2, name: 'Đậu phộng (Peanuts)' },
  { id: 3, name: 'Sữa động vật (Dairy)' },
  { id: 4, name: 'Trứng (Eggs)' },
  { id: 5, name: 'Gluten (Lúa mì)' },
  { id: 6, name: 'Đậu nành (Soy)' },
];

const BE_CONDITIONS: MetaItem[] = [
  { id: 1, name: 'Tiểu đường (Diabetes)' },
  { id: 2, name: 'Gout (Axit Uric cao)' },
  { id: 3, name: 'Cao huyết áp (Hypertension)' },
  { id: 4, name: 'Mỡ máu cao (Dyslipidemia)' },
];

describe('bảng id', () => {
  test('khớp dữ liệu seed của backend', () => {
    expect(ALLERGY_META_ID_BY_SLUG).toEqual({
      seafood: 1,
      peanut: 2,
      dairy: 3,
      egg: 4,
      gluten: 5,
      soy: 6,
    });
    expect(CONDITION_META_ID_BY_SLUG).toEqual({ diabetes: 1, gout: 2, hypertension: 3 });
    expect(TAG_META_ID_BY_SLUG).toEqual({ eatClean: 1, keto: 2, vegan: 3, quick: 5 });
  });

  test('tra ngược id → slug và ngược lại là một cặp nghịch đảo', () => {
    Object.entries(ALLERGY_META_ID_BY_SLUG).forEach(([slug, id]) => {
      expect(allergySlugFromMetaId(id)).toBe(slug);
    });
    Object.entries(CONDITION_META_ID_BY_SLUG).forEach(([slug, id]) => {
      expect(conditionSlugFromMetaId(id)).toBe(slug);
    });
    Object.entries(TAG_META_ID_BY_SLUG).forEach(([slug, id]) => {
      expect(tagSlugFromMetaId(id)).toBe(slug);
    });
  });

  test('id không có tương đương ở FE → undefined (vd. bệnh lý 4, tag 4/6)', () => {
    expect(conditionSlugFromMetaId(4)).toBeUndefined();
    expect(tagSlugFromMetaId(4)).toBeUndefined();
    expect(tagSlugFromMetaId(6)).toBeUndefined();
    expect(allergySlugFromMetaId(99)).toBeUndefined();
  });

  test('slug chỉ có ở FE không có id trên BE', () => {
    ['treeNut', 'sesame', 'other'].forEach(slug => expect(hasAllergyMetaId(slug)).toBe(false));
    expect(hasConditionMetaId('other')).toBe(false);
    expect(hasAllergyMetaId('seafood')).toBe(true);
    expect(hasConditionMetaId('gout')).toBe(true);
  });
});

describe('toMetaIds', () => {
  test('bỏ slug không có id và loại id trùng, giữ thứ tự', () => {
    expect(
      toMetaIds(['soy', 'treeNut', 'seafood', 'soy', 'other'], ALLERGY_META_ID_BY_SLUG),
    ).toEqual([6, 1]);
  });

  test('danh sách rỗng → rỗng', () => {
    expect(toMetaIds([], ALLERGY_META_ID_BY_SLUG)).toEqual([]);
  });
});

describe('đối chiếu theo tên', () => {
  test('nhận ra đủ tên dị ứng/bệnh lý của backend', () => {
    expect(BE_ALLERGIES.map(item => allergySlugFromName(item.name))).toEqual([
      'seafood',
      'peanut',
      'dairy',
      'egg',
      'gluten',
      'soy',
    ]);
    expect(BE_CONDITIONS.map(item => conditionSlugFromName(item.name))).toEqual([
      'diabetes',
      'gout',
      'hypertension',
      undefined,
    ]);
  });

  test('không phân biệt hoa/thường, nhận cả tên tiếng Việt lẫn tiếng Anh', () => {
    expect(allergySlugFromName('HẢI SẢN')).toBe('seafood');
    expect(allergySlugFromName('peanuts')).toBe('peanut');
    expect(conditionSlugFromName('cao huyết áp')).toBe('hypertension');
    expect(conditionSlugFromName('Chưa biết')).toBeUndefined();
  });
});

describe('verifyMetaMapping', () => {
  test('dữ liệu seed thật → không có chỗ lệch', () => {
    expect(verifyMetaMapping(BE_ALLERGIES, BE_CONDITIONS)).toEqual([]);
  });

  test('bản mock của metaService khớp bảng id', async () => {
    const [allergies, conditions] = await Promise.all([
      metaMockService.getAllergies(),
      metaMockService.getMedicalConditions(),
    ]);
    expect(verifyMetaMapping(allergies, conditions)).toEqual([]);
  });

  test('DB seed lại làm id trỏ sang mục khác → báo lệch', () => {
    const reseeded: MetaItem[] = [
      { id: 1, name: 'Đậu phộng (Peanuts)' },
      { id: 2, name: 'Hải sản (Seafood)' },
      ...BE_ALLERGIES.slice(2),
    ];

    const problems = verifyMetaMapping(reseeded, BE_CONDITIONS);

    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('id 1');
    expect(problems[1]).toContain('id 2');
  });

  test('thiếu hẳn id trên BE → báo lệch', () => {
    const problems = verifyMetaMapping(BE_ALLERGIES, BE_CONDITIONS.filter(item => item.id !== 3));

    expect(problems).toEqual(['condition: không có id 3 (slug "hypertension") trên BE']);
  });
});
