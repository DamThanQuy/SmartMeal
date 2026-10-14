/**
 * grocery.mapper: nhóm của BE → 6 nhóm của thiết kế (BR-172), món tự thêm giữ nhóm FE, sắp theo thứ tự
 * thiết kế, lần đi chợ gần nhất.
 */
import { fromGrocerySummaryDto, toFeCategory } from '@/features/grocery/services/grocery.mapper';
import type { GroceryItemDto } from '@/features/grocery/types/grocery.api.types';

function item(overrides: Partial<GroceryItemDto>): GroceryItemDto {
  return {
    id: 'i',
    ingredientName: 'X',
    amount: 100,
    unit: 'g',
    category: 'Khác',
    estimatedPriceVnd: 1000,
    isChecked: false,
    recipeTitle: null,
    mergedFromRecipeCount: 1,
    isManual: false,
    ...overrides,
  };
}

describe('grocery.mapper', () => {
  test('quy đổi nhóm BE; nhóm gộp/lạ phân loại lại theo tên; nhóm FE giữ nguyên', () => {
    expect(toFeCategory('Rau củ & Trái cây', 'Dưa leo')).toBe('Rau củ');
    expect(toFeCategory('Thịt & Thủy hải sản', 'Cá hồi phi lê')).toBe('Thịt cá');
    expect(toFeCategory('Sữa & Trứng', 'Trứng gà')).toBe('Sữa');
    expect(toFeCategory('Gia vị & Đồ khô', 'Gạo lứt đỏ')).toBe('Ngũ cốc');
    expect(toFeCategory('Gia vị & Đồ khô', 'Sốt mè rang')).toBe('Gia vị');
    expect(toFeCategory('Khác', 'Ớt chuông đỏ')).toBe('Rau củ');
    expect(toFeCategory('Đồ khô', 'Giấy bạc')).toBe('Đồ khô');
  });

  test('gom lại theo nhóm FE, sắp theo thiết kế, giữ kỳ danh sách và lần đi chợ trước', () => {
    const list = fromGrocerySummaryDto('2026-09-07', {
      totalItems: 3,
      checkedItems: 1,
      totalEstimatedCostVnd: 60000,
      categories: [
        {
          categoryName: 'Gia vị & Đồ khô',
          items: [
            item({ id: 'a', ingredientName: 'Sốt mè rang', amount: 1.25, unit: 'muỗng' }),
            item({ id: 'b', ingredientName: 'Yến mạch cán dẹt', isChecked: true, mergedFromRecipeCount: 3 }),
          ],
        },
        { categoryName: 'Rau củ', items: [item({ id: 'c', ingredientName: 'Rau muống', category: 'Rau củ', isManual: true })] },
      ],
      periodStart: '2026-09-07',
      periodEnd: '2026-09-13',
      generatedAt: '2026-09-06T10:00:00Z',
      lastTrip: {
        id: 't',
        periodStart: null,
        periodEnd: null,
        purchasedItems: 4,
        pendingItemsKept: 1,
        estimatedCostVnd: 90000,
        actualCostVnd: null,
        completedAt: '2026-09-05T10:00:00Z',
      },
    });

    expect(list.groups.map(group => group.category)).toEqual(['Rau củ', 'Ngũ cốc', 'Gia vị']);
    expect(list.groups[0].items[0]).toMatchObject({ isManual: true, status: 'pending' });
    expect(list.groups[1].items[0]).toMatchObject({ status: 'purchased', mergedFromRecipeCount: 3 });
    expect(list.groups[2].items[0].amountLabel).toBe('1.3 muỗng');
    expect(list.periodStartIso).toBe('2026-09-07');
    expect(list.lastTrip).toMatchObject({ purchasedItems: 4, actualCostVnd: undefined });
  });
});
