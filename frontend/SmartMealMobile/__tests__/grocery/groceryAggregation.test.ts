/**
 * groceryAggregation: phân nhóm nguyên liệu khi BE trả nhóm gộp/lạ (BR-172), quy đổi số lượng nhập tay
 * (kg → g, l → ml) và ước tính chi phí làm tròn tới nghìn đồng (BR-174).
 */
import {
  categorizeIngredient,
  estimateItemCostVnd,
  manualQuantityToParsedAmount,
} from '@/features/grocery/utils/groceryAggregation';

describe('categorizeIngredient', () => {
  test.each([
    ['Xà lách Romaine', 'Rau củ'],
    ['Nấm đông cô', 'Rau củ'],
    ['Cá hồi phi lê', 'Thịt cá'],
    ['Đậu hũ non', 'Thịt cá'],
    ['Sữa chua Hy Lạp', 'Sữa'],
    ['Gạo lứt đỏ', 'Ngũ cốc'],
    ['Bánh mì nguyên cám', 'Ngũ cốc'],
    ['Sốt mè rang', 'Gia vị'],
    ['Mật ong', 'Đồ khô'],
    ['Giấy bạc', 'Đồ khô'],
  ])('%s → %s', (name, category) => {
    expect(categorizeIngredient(name)).toBe(category);
  });

  test('không phân biệt hoa/thường', () => {
    expect(categorizeIngredient('CÀ RỐT')).toBe('Rau củ');
  });

  test('"Chuối tiêu" (chuối) không bị xếp vào Gia vị chỉ vì có chữ "tiêu"', () => {
    expect(categorizeIngredient('Chuối tiêu')).not.toBe('Gia vị');
  });
});

describe('manualQuantityToParsedAmount', () => {
  test('kg → g và l → ml, g/ml giữ nguyên', () => {
    expect(manualQuantityToParsedAmount(1.5, 'kg')).toEqual({
      quantity: 1500,
      unitKind: 'g',
      unitLabel: 'g',
    });
    expect(manualQuantityToParsedAmount(2, ' L ')).toEqual({
      quantity: 2000,
      unitKind: 'ml',
      unitLabel: 'ml',
    });
    expect(manualQuantityToParsedAmount(300, 'g')).toEqual({
      quantity: 300,
      unitKind: 'g',
      unitLabel: 'g',
    });
    expect(manualQuantityToParsedAmount(250, 'ml')).toEqual({
      quantity: 250,
      unitKind: 'ml',
      unitLabel: 'ml',
    });
  });

  test('đơn vị đếm (quả, bó, gói…) giữ nguyên nhãn gốc để hiển thị', () => {
    expect(manualQuantityToParsedAmount(6, 'quả')).toEqual({
      quantity: 6,
      unitKind: 'piece',
      unitLabel: 'quả',
    });
  });
});

describe('estimateItemCostVnd', () => {
  test('dùng giá theo gram/ml/cái của nguyên liệu và làm tròn tới nghìn đồng', () => {
    expect(
      estimateItemCostVnd('Thịt bò thăn', {
        quantity: 200,
        unitKind: 'g',
        unitLabel: 'g',
      }),
    ).toBe(56000);
    expect(
      estimateItemCostVnd('Sữa tươi không đường', {
        quantity: 1000,
        unitKind: 'ml',
        unitLabel: 'ml',
      }),
    ).toBe(18000);
    expect(
      estimateItemCostVnd('Trứng gà', {
        quantity: 10,
        unitKind: 'piece',
        unitLabel: 'quả',
      }),
    ).toBe(35000);
    expect(
      estimateItemCostVnd('Ức gà', {
        quantity: 155,
        unitKind: 'g',
        unitLabel: 'g',
      }),
    ).toBe(11000); // 10.850 → 11.000
  });

  test('nguyên liệu không có trong bảng giá → giá mặc định theo đơn vị', () => {
    expect(
      estimateItemCostVnd('Hạt chia', {
        quantity: 100,
        unitKind: 'g',
        unitLabel: 'g',
      }),
    ).toBe(2000);
    expect(
      estimateItemCostVnd('Nước dừa', {
        quantity: 500,
        unitKind: 'ml',
        unitLabel: 'ml',
      }),
    ).toBe(10000);
    expect(
      estimateItemCostVnd('Bánh tráng', {
        quantity: 2,
        unitKind: 'piece',
        unitLabel: 'gói',
      }),
    ).toBe(16000);
  });

  test('"cà chua bi" lấy giá riêng, không lấy giá "cà chua"', () => {
    expect(
      estimateItemCostVnd('Cà chua bi', {
        quantity: 10,
        unitKind: 'piece',
        unitLabel: 'quả',
      }),
    ).toBe(10000);
    expect(
      estimateItemCostVnd('Cà chua', {
        quantity: 10,
        unitKind: 'piece',
        unitLabel: 'quả',
      }),
    ).toBe(30000);
  });

  test('không đọc được số lượng ("Vừa đủ") → chi phí tối thiểu 5.000đ', () => {
    expect(estimateItemCostVnd('Muối', null)).toBe(5000);
  });
});
