/**
 * Live: đăng ký/đăng nhập, làm mới phiên khi access token hết hạn, đăng xuất, quên → xác thực OTP →
 * đặt lại mật khẩu, khóa tài khoản — chạy service THẬT của app với backend thật. Chỉ chạy khi có
 * LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, readLatestOtp, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type StorageModule = typeof import('@/services/storage/secureStorage');
type ErrorsModule = typeof import('@/services/api/errors');
type InterceptorsModule = typeof import('@/services/api/interceptors');

describeLive('auth (backend thật)', () => {
  let authService: AuthModule['authService'];
  let storage: StorageModule;
  let ApiError: ErrorsModule['ApiError'];
  let onUnauthorized: jest.Mock;

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    storage = require('@/services/storage/secureStorage') as StorageModule;
    ({ ApiError } = require('@/services/api/errors') as ErrorsModule);
    const { setUnauthorizedHandler } = require('@/services/api/interceptors') as InterceptorsModule;
    onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
  });

  beforeEach(async () => {
    onUnauthorized.mockClear();
    await storage.clearSessionTokens();
  });

  test('đăng ký lưu cả hai token, /auth/me trả đúng người dùng chưa có hồ sơ', async () => {
    const email = uniqueEmail();

    const result = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });

    expect(result).toMatchObject({ email, requiresOtp: false });
    expect(result.user).toMatchObject({ email, hasCompletedSurvey: false, isPro: false });
    expect(await storage.tokenStorage.get()).toBeTruthy();
    expect(await storage.refreshTokenStorage.get()).toBeTruthy();
    expect(await authService.getMe()).toMatchObject({ email, fullName: 'Người Thử' });
  });

  test('email trùng → lỗi nghiệp vụ tiếng Việt của BE, không lưu token', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    await storage.clearSessionTokens();

    await expect(authService.register({ fullName: 'Người Khác', email, password: 'Passw0rd!' })).rejects.toMatchObject({
      code: 'BUSINESS',
      message: 'Email đã được sử dụng.',
    });
    expect(await storage.tokenStorage.get()).toBeNull();
  });

  test('access token hết hạn → interceptor tự làm mới và request vẫn thành công, token được xoay vòng', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    const refreshBefore = await storage.refreshTokenStorage.get();
    await storage.tokenStorage.set('het-han-hoac-sai'); // mô phỏng JWT đã hết hạn

    const me = await authService.getMe();

    expect(me.email).toBe(email);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(await storage.tokenStorage.get()).not.toBe('het-han-hoac-sai');
    expect(await storage.refreshTokenStorage.get()).not.toBe(refreshBefore); // refresh token dùng một lần
  });

  test('nhiều request cùng hết hạn chỉ làm mới một lần và đều thành công', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    await storage.tokenStorage.set('het-han-hoac-sai');

    const results = await Promise.all([authService.getMe(), authService.getMe(), authService.getMe()]);

    expect(results.map(user => user.email)).toEqual([email, email, email]);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  test('đăng xuất thu hồi refresh token: phiên cũ không làm mới được nữa → báo hết phiên', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    const refreshToken = (await storage.refreshTokenStorage.get()) as string;

    await authService.logout(refreshToken);
    await storage.tokenStorage.set('het-han-hoac-sai'); // giữ lại refresh token đã bị thu hồi

    await expect(authService.getMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  test('sai mật khẩu là 401 nhưng KHÔNG phải hết phiên; đúng mật khẩu thì đăng nhập được', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    await storage.clearSessionTokens();

    await expect(authService.login({ email, password: 'sai-mat-khau' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();

    const { user } = await authService.login({ email, password: 'Passw0rd!' });
    expect(user.email).toBe(email);
  });

  test('đăng nhập sai quá nhiều lần → 423 LOCKED kèm message của BE', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    await storage.clearSessionTokens();

    let last: unknown;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      last = await authService.login({ email, password: `sai-${attempt}` }).catch(error => error);
    }

    expect(last).toBeInstanceOf(ApiError);
    expect(last).toMatchObject({ code: 'LOCKED', status: 423 });
    // Đang bị khóa thì mật khẩu đúng cũng không vào được.
    await expect(authService.login({ email, password: 'Passw0rd!' })).rejects.toMatchObject({ code: 'LOCKED' });
  });

  test('quên mật khẩu: gửi mã → mã sai bị từ chối → mã đúng cấp resetToken → đặt lại → mật khẩu mới đăng nhập được', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    await storage.clearSessionTokens();

    await authService.requestPasswordReset({ email });
    const code = readLatestOtp(email);

    const wrong = code === '000000' ? '111111' : '000000';
    await expect(authService.verifyOtp({ email, code: wrong, purpose: 'reset-password' })).rejects.toMatchObject({
      code: 'BUSINESS',
    });

    const { resetToken } = await authService.verifyOtp({ email, code, purpose: 'reset-password' });
    expect(resetToken).toBeTruthy();

    await authService.resetPassword({ email, resetToken: resetToken as string, newPassword: 'MatKhauMoi9!' });

    await expect(authService.login({ email, password: 'Passw0rd!' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const { user } = await authService.login({ email, password: 'MatKhauMoi9!' });
    expect(user.email).toBe(email);
    // resetToken chỉ dùng một lần.
    await expect(
      authService.resetPassword({ email, resetToken: resetToken as string, newPassword: 'MatKhauKhac9!' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  test('gửi lại mã trong thời gian chờ vẫn trả thành công nhưng KHÔNG phát hành mã mới (mã cũ còn dùng được)', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    await authService.requestPasswordReset({ email });
    const first = readLatestOtp(email);

    await expect(authService.resendOtp({ email, purpose: 'reset-password' })).resolves.toBeUndefined();

    expect(readLatestOtp(email)).toBe(first);
    await expect(authService.verifyOtp({ email, code: first, purpose: 'reset-password' })).resolves.toMatchObject({
      resetToken: expect.any(String),
    });
  });

  test('xóa dữ liệu cá nhân thành công và giữ lại tài khoản', async () => {
    const email = uniqueEmail();
    await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });

    await expect(authService.deleteMyData()).resolves.toBeUndefined();

    expect((await authService.getMe()).email).toBe(email);
  });

  test('đăng nhập Google khi máy chủ chưa cấu hình → UNAVAILABLE (503), không phải hết phiên', async () => {
    await expect(authService.loginWithGoogle({ idToken: 'khong-phai-token-that' })).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      status: 503,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  test('forgot-password với email chưa đăng ký vẫn thành công (không lộ tài khoản)', async () => {
    await expect(authService.requestPasswordReset({ email: uniqueEmail('khong-co') })).resolves.toBeUndefined();
  });
});
