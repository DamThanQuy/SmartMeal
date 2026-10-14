/**
 * metaLookup / metaCatalog (docs/fetch-api/part1 §6.4): slug FE ↔ id BE theo `code` của /meta/*, KHÔNG
 * có bảng id cứng. Gửi sai id nghĩa là lưu sai dị ứng/bệnh lý của người dùng nên bảng phải đến từ BE.
 */
import {
  ALLERGY_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
  HEALTH_CONDITION_OPTIONS,
} from '@/features/health/types/health.types';
import {
  createMetaLookup,
  toMetaCodes,
  toMetaIds,
  type MetaCatalog,
} from '@/features/health/services/metaLookup';
import type { MetaItem } from '@/features/health/types/health.api.types';
import { createTestCatalog } from '../../test-utils/metaCatalog';

const ITEMS: MetaItem[] = [
  { id: 10, code: 'seafood', name: 'Hải sản' },
  { id: 11, code: 'peanut', name: 'Đậu phộng' },
  { id: 12, code: 'sesame', name: 'Mè' },
];

describe('metaLookup', () => {
  const lookup = createMetaLookup(ITEMS);

  test('ánh xạ hai chiều theo code, không phụ thuộc giá trị id', () => {
    expect(lookup.idByCode('peanut')).toBe(11);
    expect(lookup.codeById(12)).toBe('sesame');
    expect(lookup.hasCode('seafood')).toBe(true);
  });

  test('mục BE không có ("other") hoặc id lạ → undefined/false', () => {
    expect(lookup.idByCode('other')).toBeUndefined();
    expect(lookup.hasCode('other')).toBe(false);
    expect(lookup.codeById(999)).toBeUndefined();
  });

  test('toMetaIds bỏ slug không có trên BE và loại trùng; toMetaCodes bỏ id lạ và loại trùng', () => {
    expect(toMetaIds(['peanut', 'other', 'seafood', 'peanut'], lookup)).toEqual([11, 10]);
    expect(toMetaIds([], lookup)).toEqual([]);
    expect(toMetaCodes([12, 999, 10, 12], lookup)).toEqual(['sesame', 'seafood']);
  });

  test('DB seed lại với id khác vẫn ánh xạ đúng (vì dựa vào code)', () => {
    const reseeded = createMetaLookup([
      { id: 5, code: 'peanut', name: 'Đậu phộng' },
      { id: 6, code: 'seafood', name: 'Hải sản' },
    ]);

    expect(toMetaIds(['seafood', 'peanut'], reseeded)).toEqual([6, 5]);
  });
});

describe('danh mục mock khớp backend và các lựa chọn trên giao diện', () => {
  let catalog: MetaCatalog;

  beforeAll(async () => {
    catalog = await createTestCatalog();
  });

  // "Khác" là ô nhập tự do nên là mục duy nhất BE không có.
  const withoutOther = (options: readonly { id: string }[]) =>
    options.map(option => option.id).filter(id => id !== 'other');

  test.each([
    ['dị ứng', ALLERGY_OPTIONS, (c: MetaCatalog) => c.allergies],
    ['bệnh lý', HEALTH_CONDITION_OPTIONS, (c: MetaCatalog) => c.conditions],
    ['chế độ ăn', DIETARY_PREFERENCE_OPTIONS, (c: MetaCatalog) => c.tags],
  ] as const)('mọi lựa chọn %s của giao diện (trừ "Khác") có code tương ứng trên BE', (_label, options, pick) => {
    const lookup = pick(catalog);

    expect(withoutOther(options).filter(id => !lookup.hasCode(id))).toEqual([]);
  });

  test('"Khác" không có trên BE nên chỉ lưu ở máy', () => {
    expect(catalog.allergies.hasCode('other')).toBe(false);
    expect(catalog.conditions.hasCode('other')).toBe(false);
  });
});

describe('getMetaCatalog', () => {
  function load(getAllergies: jest.Mock) {
    jest.resetModules();
    jest.doMock('@/features/health/services/metaService', () => ({
      metaService: {
        getAllergies,
        getMedicalConditions: jest.fn().mockResolvedValue([{ id: 1, code: 'gout', name: 'Gout' }]),
        getTags: jest.fn().mockResolvedValue([{ id: 1, code: 'keto', name: 'Keto' }]),
      },
    }));
    return require('@/features/health/services/metaCatalog') as typeof import('@/features/health/services/metaCatalog');
  }

  test('tải một lần cho cả phiên rồi dùng lại', async () => {
    const getAllergies = jest.fn().mockResolvedValue([{ id: 3, code: 'dairy', name: 'Sữa' }]);
    const { getMetaCatalog } = load(getAllergies);

    const first = await getMetaCatalog();
    const second = await getMetaCatalog();

    expect(getAllergies).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.allergies.idByCode('dairy')).toBe(3);
    expect(first.conditions.idByCode('gout')).toBe(1);
    expect(first.tags.idByCode('keto')).toBe(1);
  });

  test('lỗi mạng không bị cache: lần gọi sau thử lại', async () => {
    const getAllergies = jest
      .fn()
      .mockRejectedValueOnce(new Error('mất mạng'))
      .mockResolvedValueOnce([{ id: 3, code: 'dairy', name: 'Sữa' }]);
    const { getMetaCatalog } = load(getAllergies);

    await expect(getMetaCatalog()).rejects.toThrow('mất mạng');
    const retried = await getMetaCatalog();

    expect(retried.allergies.idByCode('dairy')).toBe(3);
    expect(getAllergies).toHaveBeenCalledTimes(2);
  });
});
