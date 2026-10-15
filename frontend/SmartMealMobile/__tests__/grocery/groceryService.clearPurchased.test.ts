/** "Xóa món đã mua": gọi DELETE /grocery/clear-checked. */

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
    await groceryApiService.clearPurchased();

    expect(apiMock.delete).toHaveBeenCalledWith('/grocery/clear-checked');
  });
});
