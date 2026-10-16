/**
 * nativeGoogleSignIn: Expo Go không có phần native của @react-native-google-signin/google-signin — thư viện đó báo lỗi
 * ngay lúc được nạp. Trên Expo Go phải KHÔNG nạp (ẩn nút Google); dev build / bản chính thức thì nạp và cấu hình 1 lần.
 */
function loadModule({ expoGo, os = 'android' }: { expoGo: boolean; os?: 'android' | 'ios' | 'web' }) {
  const configure = jest.fn();
  const libraryFactory = jest.fn(() => ({
    GoogleSignin: { configure },
    statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  }));

  jest.resetModules();
  jest.doMock('@/config/runtime', () => ({ IS_EXPO_GO: expoGo }));
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  jest.doMock('@react-native-google-signin/google-signin', libraryFactory);

  const module =
    require('@/features/auth/services/nativeGoogleSignIn') as typeof import('@/features/auth/services/nativeGoogleSignIn');
  return { ...module, configure, libraryFactory };
}

describe('nativeGoogleSignIn', () => {
  test('Expo Go: không có đăng nhập Google, không nạp thư viện native', () => {
    const { isGoogleSignInSupported, isNativeGoogleSignInAvailable, loadNativeGoogleSignIn, libraryFactory } =
      loadModule({ expoGo: true });

    expect(isGoogleSignInSupported).toBe(false);
    expect(isNativeGoogleSignInAvailable).toBe(false);
    expect(loadNativeGoogleSignIn()).toBeNull();
    expect(libraryFactory).not.toHaveBeenCalled();
  });

  test('dev build: nạp thư viện khi cần và chỉ cấu hình một lần', () => {
    const { isGoogleSignInSupported, loadNativeGoogleSignIn, configure, libraryFactory } = loadModule({ expoGo: false });

    expect(isGoogleSignInSupported).toBe(true);
    expect(libraryFactory).not.toHaveBeenCalled();                 // chưa bấm nút thì chưa nạp

    const first = loadNativeGoogleSignIn();
    const second = loadNativeGoogleSignIn();

    expect(first?.statusCodes.SIGN_IN_CANCELLED).toBe('SIGN_IN_CANCELLED');
    expect(second).toBe(first);
    expect(configure).toHaveBeenCalledTimes(1);
    expect(configure).toHaveBeenCalledWith(expect.objectContaining({ offlineAccess: true }));
  });

  test('web: dùng nút Google Identity Services, không nạp thư viện native', () => {
    const { isGoogleSignInSupported, loadNativeGoogleSignIn, libraryFactory } = loadModule({ expoGo: false, os: 'web' });

    expect(isGoogleSignInSupported).toBe(true);
    expect(loadNativeGoogleSignIn()).toBeNull();
    expect(libraryFactory).not.toHaveBeenCalled();
  });
});
