/**
 * "Xóa món đã mua": bản API gọi DELETE /grocery/clear-checked; bản mock bỏ đúng các món đã tick,
 * giữ món chưa mua, và "Tạo lại theo thực đơn" hiện lại món sinh từ thực đơn.
 */
import type { GroceryList } from '@/features/grocery/types/grocery.types';

// Các service kéo theo store dùng AsyncStorage (module native) — dùng bản giả của chính thư viện.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('groceryService.api.clearPurchased', () => {
  test('DELETE /grocery/clear-checked', async () => {
    const apiMock = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn().mockResolvedValue(true) };
    jest.resetModules();
    jest.doMock('@/services/api', () => ({
      ...jest.requireActual('@/services/api'),
      api: apiMock,
    }));

    const { groceryApiService } =
      require('@/features/grocery/services/groceryService.api') as typeof import('@/features/grocery/services/groceryService.api');
    await groceryApiService.clearPurchased!('2026-10-12');

    expect(apiMock.delete).toHaveBeenCalledWith('/grocery/clear-checked');
  });
});

describe('groceryService.mock.clearPurchased', () => {
  const WEEK = '2026-10-12';

  function allItems(list: GroceryList) {
    return list.groups.flatMap(group => group.items);
  }

  test('bỏ món đã mua, giữ món chưa mua; tạo lại thì món sinh từ thực đơn hiện lại', async () => {
    jest.resetModules();
    jest.doMock('@/state/app/appStore', () => ({
      ...jest.requireActual('@/state/app/appStore'),
      getCurrentMockScenario: () => 'success',
    }));
    jest.doMock('@/config/mock', () => ({
      ...jest.requireActual('@/config/mock'),
      wait: () => Promise.resolve(),
    }));
    const { groceryMockService } =
      require('@/features/grocery/services/groceryService.mock') as typeof import('@/features/grocery/services/groceryService.mock');

    await groceryMockService.addManualItem(WEEK, { name: 'Chuối', quantity: 1, unit: 'nải', category: 'Rau củ' });
    await groceryMockService.addManualItem(WEEK, { name: 'Sữa tươi', quantity: 1, unit: 'hộp', category: 'Sữa' });
    const before = allItems(await groceryMockService.getGroceryList(WEEK));
    const banana = before.find(item => item.isManual && item.name === 'Chuối')!;
    const milk = before.find(item => item.isManual && item.name === 'Sữa tươi')!;
    const generated = before.find(item => !item.isManual);
    await groceryMockService.toggleItemStatus(WEEK, banana.id, 'purchased');
    if (generated) await groceryMockService.toggleItemStatus(WEEK, generated.id, 'purchased');

    await groceryMockService.clearPurchased(WEEK);

    const afterIds = allItems(await groceryMockService.getGroceryList(WEEK)).map(item => item.id);
    expect(afterIds).not.toContain(banana.id);
    expect(afterIds).toContain(milk.id);
    if (generated) expect(afterIds).not.toContain(generated.id);
    expect(afterIds).toHaveLength(before.length - (generated ? 2 : 1));

    if (generated) {
      const regenerated = allItems(await groceryMockService.regenerateFromPlan(WEEK));
      expect(regenerated.map(item => item.id)).toContain(generated.id);
    }
  });
});
