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
  role: 'User',
  hasCompletedSurvey: false,
};

const AUTH_RESPONSE: AuthResponseDto = {
  token: 'jwt-token',
  expiresAt: '2026-11-01T08:00:00Z',
  user: USER_DTO,
};

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };
  const tokenStorageMock = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/services/storage/secureStorage', () => ({ tokenStorage: tokenStorageMock }));

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
    expect(tokenStorageMock.set).toHaveBeenCalledWith('jwt-token');
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
    expect(tokenStorageMock.set).toHaveBeenCalledWith('jwt-token');
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

describe('hàm BE chưa có', () => {
  test('OTP và quên mật khẩu không có trong bản API (tự rơi về mock)', () => {
    const { service } = loadService();

    expect(service.verifyOtp).toBeUndefined();
    expect(service.resendOtp).toBeUndefined();
    expect(service.requestPasswordReset).toBeUndefined();
  });
});
