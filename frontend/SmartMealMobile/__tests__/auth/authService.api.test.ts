/**
 * authService.api (docs/fetch-api/part1 §5): gọi đúng endpoint, lưu token ở SecureStore (không ở
 * store/screen), quy đổi UserDto → AuthUser. `api` và tokenStorage được mock — không gọi mạng.
 */
import type { AuthResponseDto, UserDto } from '@/features/auth/types/auth.api.types';

const USER_DTO: UserDto = {
  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  email: 'an@smartmeal.vn',
  fullName: 'Nguyễn An',
  avatarUrl: null,
  isPro: false,
  subscriptionStatus: 'Free',
  proExpiresAt: null,
  role: 'User',
  hasCompletedSurvey: false,
};

const AUTH_RESPONSE: AuthResponseDto = {
  token: 'jwt-token',
  expiresAt: '2026-11-01T08:00:00Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiresAt: '2026-12-01T08:00:00Z',
  user: USER_DTO,
};

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
  // saveSessionTokens lưu cả access lẫn refresh token (một lần gọi).
  const tokenStorageMock = { set: jest.fn().mockResolvedValue(undefined) };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/services/storage/secureStorage', () => ({ saveSessionTokens: tokenStorageMock.set }));

  const { authApiService } =
    require('@/features/auth/services/authService.api') as typeof import('@/features/auth/services/authService.api');
  return { service: authApiService, apiMock, tokenStorageMock };
}

describe('login', () => {
  test('POST /auth/login, lưu token và trả user đã quy đổi', async () => {
    const { service, apiMock, tokenStorageMock } = loadService();
    apiMock.post.mockResolvedValue({
      ...AUTH_RESPONSE,
      user: { ...USER_DTO, hasCompletedSurvey: true, isPro: true },
    });

    const result = await service.login?.({ email: '  an@smartmeal.vn ', password: 'matkhau123' });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'an@smartmeal.vn',
      password: 'matkhau123',
    });
    expect(tokenStorageMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'jwt-token', refreshToken: 'refresh-token' }),
    );
    expect(result).toEqual({
      user: {
        id: USER_DTO.id,
        fullName: 'Nguyễn An',
        email: 'an@smartmeal.vn',
        avatarUrl: null,
        isPro: true,
        role: 'User',
        hasCompletedSurvey: true,
      },
    });
  });

  test('sai mật khẩu → ném lỗi và KHÔNG lưu token', async () => {
    const { service, apiMock, tokenStorageMock } = loadService();
    const error = new Error('Email hoặc mật khẩu không chính xác.');
    apiMock.post.mockRejectedValue(error);

    await expect(service.login?.({ email: 'an@smartmeal.vn', password: 'sai' })).rejects.toBe(error);
    expect(tokenStorageMock.set).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  test('POST /auth/register, lưu token, không cần OTP và chưa có hồ sơ sức khỏe', async () => {
    const { service, apiMock, tokenStorageMock } = loadService();
    apiMock.post.mockResolvedValue(AUTH_RESPONSE);

    const result = await service.register?.({
      fullName: '  Nguyễn An ',
      email: ' an@smartmeal.vn',
      password: 'matkhau123',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/register', {
      email: 'an@smartmeal.vn',
      password: 'matkhau123',
      fullName: 'Nguyễn An',
    });
    expect(tokenStorageMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'jwt-token', refreshToken: 'refresh-token' }),
    );
    expect(result?.requiresOtp).toBe(false);
    expect(result?.email).toBe('an@smartmeal.vn');
    expect(result?.user).toMatchObject({ id: USER_DTO.id, hasCompletedSurvey: false });
  });

  test('email trùng → ném lỗi của BE và KHÔNG lưu token', async () => {
    const { service, apiMock, tokenStorageMock } = loadService();
    const error = new Error('Email đã được sử dụng.');
    apiMock.post.mockRejectedValue(error);

    await expect(
      service.register?.({ fullName: 'An', email: 'an@smartmeal.vn', password: 'matkhau123' }),
    ).rejects.toBe(error);
    expect(tokenStorageMock.set).not.toHaveBeenCalled();
  });
});

describe('getMe', () => {
  test('GET /auth/me → AuthUser mới nhất (isPro, hasCompletedSurvey)', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue({
      ...USER_DTO,
      avatarUrl: 'https://cdn.smartmeal.vn/a.png',
      isPro: true,
      hasCompletedSurvey: true,
    });

    const user = await service.getMe?.();

    expect(apiMock.get).toHaveBeenCalledWith('/auth/me');
    expect(user).toMatchObject({
      id: USER_DTO.id,
      avatarUrl: 'https://cdn.smartmeal.vn/a.png',
      isPro: true,
      hasCompletedSurvey: true,
    });
  });
});

describe('updateProfile', () => {
  test('PUT /auth/profile { fullName } (đã cắt khoảng trắng) và trả họ tên BE đã lưu', async () => {
    const { service, apiMock } = loadService();
    apiMock.put.mockResolvedValue({ ...USER_DTO, fullName: 'Nguyễn Văn An' });

    const result = await service.updateProfile?.({ fullName: '  Nguyễn Văn An  ' });

    expect(apiMock.put).toHaveBeenCalledWith('/auth/profile', { fullName: 'Nguyễn Văn An' });
    expect(result).toEqual({ fullName: 'Nguyễn Văn An' });
  });

  test('BE báo lỗi → ném lỗi', async () => {
    const { service, apiMock } = loadService();
    const error = new Error('Người dùng không tồn tại.');
    apiMock.put.mockRejectedValue(error);

    await expect(service.updateProfile?.({ fullName: 'An' })).rejects.toBe(error);
  });
});

describe('logout', () => {
  test('POST /auth/logout với refresh token đã đọc từ trước, không gắn Bearer', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(true);

    await service.logout?.('refresh-1');

    expect(apiMock.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'refresh-1' },
      { skipAuth: true },
    );
  });
});

describe('quên / xác thực OTP / đặt lại mật khẩu', () => {
  test('requestPasswordReset: POST /auth/forgot-password với email đã cắt khoảng trắng', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(true);

    await service.requestPasswordReset?.({ email: '  an@smartmeal.vn ' });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'an@smartmeal.vn' });
  });

  test.each([
    ['reset-password', 'reset-password'],
    ['register', 'verify-email'],
  ] as const)('resendOtp: mục đích %s gửi slug %s', async (purpose, slug) => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(true);

    await service.resendOtp?.({ email: 'an@smartmeal.vn', purpose });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/resend-otp', { email: 'an@smartmeal.vn', purpose: slug });
  });

  test('verifyOtp: gửi mã 6 số và trả resetToken của BE', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ verified: true, resetToken: 'reset-abc', resetTokenExpiresAt: '2026-10-03T10:10:00Z' });

    const result = await service.verifyOtp?.({ email: 'an@smartmeal.vn', code: '123456', purpose: 'reset-password' });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/verify-otp', {
      email: 'an@smartmeal.vn',
      code: '123456',
      purpose: 'reset-password',
    });
    expect(result).toEqual({ resetToken: 'reset-abc' });
  });

  test('verifyOtp: xác thực email (không có resetToken) → resetToken undefined', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ verified: true, resetToken: null, resetTokenExpiresAt: null });

    const result = await service.verifyOtp?.({ email: 'an@smartmeal.vn', code: '123456', purpose: 'register' });

    expect(result).toEqual({ resetToken: undefined });
  });

  test('verifyOtp: mã sai → ném lỗi của BE', async () => {
    const { service, apiMock } = loadService();
    const error = new Error('Mã xác thực không đúng hoặc đã hết hạn.');
    apiMock.post.mockRejectedValue(error);

    await expect(
      service.verifyOtp?.({ email: 'an@smartmeal.vn', code: '000000', purpose: 'reset-password' }),
    ).rejects.toBe(error);
  });

  test('resetPassword: POST /auth/reset-password kèm resetToken', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(true);

    await service.resetPassword?.({ email: 'an@smartmeal.vn', resetToken: 'reset-abc', newPassword: 'MatKhauMoi1!' });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'an@smartmeal.vn',
      resetToken: 'reset-abc',
      newPassword: 'MatKhauMoi1!',
    });
  });
});

describe('ảnh đại diện và xóa dữ liệu', () => {
  test('uploadAvatar: POST /auth/avatar dạng multipart với trường file, trả avatarUrl mới', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ ...USER_DTO, avatarUrl: 'https://cdn.smartmeal.vn/a.jpg' });

    const result = await service.uploadAvatar?.({ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' });

    const [url, body, config] = apiMock.post.mock.calls[0];
    expect(url).toBe('/auth/avatar');
    expect(body).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(config.timeout).toBeGreaterThan(15000);
    expect(result).toEqual({ avatarUrl: 'https://cdn.smartmeal.vn/a.jpg' });
  });

  test('uploadAvatar: BE từ chối ảnh (sai loại/quá lớn) → ném lỗi của BE', async () => {
    const { service, apiMock } = loadService();
    const error = new Error('Ảnh tối đa 2 MB.');
    apiMock.post.mockRejectedValue(error);

    await expect(service.uploadAvatar?.({ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' })).rejects.toBe(error);
  });

  test('deleteMyData: DELETE /me/data', async () => {
    const { service, apiMock } = loadService();
    apiMock.delete.mockResolvedValue({ deleted: { diaryItems: 3 } });

    await service.deleteMyData?.();

    expect(apiMock.delete).toHaveBeenCalledWith('/me/data');
  });
});

describe('loginWithGoogle', () => {
  test('POST /auth/google { idToken }, lưu cặp token và trả user', async () => {
    const { service, apiMock, tokenStorageMock } = loadService();
    apiMock.post.mockResolvedValue({ ...AUTH_RESPONSE, user: { ...USER_DTO, hasCompletedSurvey: true } });

    const result = await service.loginWithGoogle?.({ idToken: 'google-id-token' });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-id-token' });
    expect(tokenStorageMock.set).toHaveBeenCalledWith(expect.objectContaining({ token: 'jwt-token', refreshToken: 'refresh-token' }));
    expect(result?.user).toMatchObject({ id: USER_DTO.id, hasCompletedSurvey: true });
  });

  test('token bị từ chối → ném lỗi và KHÔNG lưu token', async () => {
    const { service, apiMock, tokenStorageMock } = loadService();
    const error = new Error('Google ID token không hợp lệ hoặc đã hết hạn.');
    apiMock.post.mockRejectedValue(error);

    await expect(service.loginWithGoogle?.({ idToken: 'x' })).rejects.toBe(error);
    expect(tokenStorageMock.set).not.toHaveBeenCalled();
  });
});
