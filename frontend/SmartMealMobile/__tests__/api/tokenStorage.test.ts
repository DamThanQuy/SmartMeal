/**
 * tokenStorage (docs/fetch-api/part1 §4.5): token ở expo-secure-store, có cache trong bộ nhớ;
 * web fallback sang AsyncStorage (SecureStore không chạy trên web).
 */

interface SecureStoreMock {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
}

interface StorageMock {
  getString: jest.Mock;
  setString: jest.Mock;
  delete: jest.Mock;
}

function loadTokenStorage(os: 'ios' | 'web') {
  const secureStore: SecureStoreMock = {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  };
  const storage: StorageMock = {
    getString: jest.fn(),
    setString: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  jest.resetModules();
  jest.doMock('expo-secure-store', () => secureStore);
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  jest.doMock('@/services/storage/storage', () => ({ storageService: storage }));

  const { tokenStorage } =
    require('@/services/storage/secureStorage') as typeof import('@/services/storage/secureStorage');
  return { tokenStorage, secureStore, storage };
}

describe('tokenStorage (native)', () => {
  test('get() đọc SecureStore đúng 1 lần rồi dùng cache', async () => {
    const { tokenStorage, secureStore } = loadTokenStorage('ios');
    secureStore.getItemAsync.mockResolvedValue('jwt');

    expect(await tokenStorage.get()).toBe('jwt');
    expect(await tokenStorage.get()).toBe('jwt');

    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('auth.accessToken');
  });

  test('chưa có token → null và cũng được cache', async () => {
    const { tokenStorage, secureStore } = loadTokenStorage('ios');
    secureStore.getItemAsync.mockResolvedValue(null);

    expect(await tokenStorage.get()).toBeNull();
    expect(await tokenStorage.get()).toBeNull();
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  test('SecureStore ném lỗi khi đọc → coi như chưa đăng nhập (không crash)', async () => {
    const { tokenStorage, secureStore } = loadTokenStorage('ios');
    secureStore.getItemAsync.mockRejectedValue(new Error('keystore hỏng'));

    await expect(tokenStorage.get()).resolves.toBeNull();
  });

  test('set() ghi SecureStore và cập nhật cache', async () => {
    const { tokenStorage, secureStore } = loadTokenStorage('ios');

    await tokenStorage.set('new-token');

    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth.accessToken', 'new-token');
    expect(await tokenStorage.get()).toBe('new-token');
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
  });

  test('set() lỗi ghi storage vẫn giữ token trong phiên hiện tại', async () => {
    const { tokenStorage, secureStore } = loadTokenStorage('ios');
    secureStore.setItemAsync.mockRejectedValue(new Error('đầy bộ nhớ'));

    await expect(tokenStorage.set('t')).resolves.toBeUndefined();
    expect(await tokenStorage.get()).toBe('t');
  });

  test('clear() xóa khỏi SecureStore và cache', async () => {
    const { tokenStorage, secureStore } = loadTokenStorage('ios');
    await tokenStorage.set('t');

    await tokenStorage.clear();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth.accessToken');
    expect(await tokenStorage.get()).toBeNull();
  });
});

describe('tokenStorage (web)', () => {
  test('dùng AsyncStorage thay cho SecureStore', async () => {
    const { tokenStorage, secureStore, storage } = loadTokenStorage('web');
    storage.getString.mockResolvedValue('web-jwt');

    expect(await tokenStorage.get()).toBe('web-jwt');
    await tokenStorage.set('web-jwt-2');
    await tokenStorage.clear();

    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(storage.setString).toHaveBeenCalledWith('auth.accessToken', 'web-jwt-2');
    expect(storage.delete).toHaveBeenCalledWith('auth.accessToken');
  });
});
