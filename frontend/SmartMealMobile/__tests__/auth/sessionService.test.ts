/**
 * sessionService (docs/fetch-api/part1 §4.7): khôi phục phiên khi khởi động, mở phiên sau khi đăng
 * nhập, xử lý hết hạn (401) và dọn dữ liệu khi đăng xuất. Mọi phụ thuộc ngoài (API, SecureStore,
 * navigation, QueryClient) đều được mock.
 */
import type { AuthUser } from '@/state/auth/authStore';
import type {
  HealthProfileExtras,
  HealthProfileSnapshot,
  HydratedHealthProfile,
} from '@/features/health/types/health.types';

const USER: AuthUser = {
  id: 'user-1',
  fullName: 'Nguyễn An',
  email: 'an@smartmeal.vn',
  avatarUrl: null,
  isPro: false,
  role: 'User',
  hasCompletedSurvey: true,
};

const SNAPSHOT: HealthProfileSnapshot = {
  gender: 'female',
  age: 30,
  heightCm: 160,
  weightKg: 55,
  goalWeightKg: 52,
  activityLevel: 'moderate',
  goal: 'lose',
  allergyIds: ['peanut'],
  healthConditionIds: [],
  result: {
    bmi: 21.5,
    bmr: 1283,
    tdee: 1988,
    calorieTarget: 1488,
    macros: { proteinG: 93, carbsG: 186, fatG: 41 },
    goal: 'lose',
  },
};

const EXTRAS: HealthProfileExtras = {
  dietaryPreferenceIds: ['vegan'],
  localAllergyIds: [],
  localHealthConditionIds: [],
};

const HYDRATED: HydratedHealthProfile = { snapshot: SNAPSHOT, extras: EXTRAS };

function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function load(useMockApi = false) {
  const authServiceMock = { getMe: jest.fn() };
  const healthMock = { getHealthProfile: jest.fn() };
  const tokenStorageMock = {
    get: jest.fn(),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const queryClientMock = {
    cancelQueries: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
  };
  const setUnauthorizedHandler = jest.fn();
  const navigationRefMock = { isReady: jest.fn().mockReturnValue(true), navigate: jest.fn() };
  const resetUserDataMock = jest.fn();

  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  jest.doMock('@/features/health', () => ({ healthProfileService: healthMock }));
  jest.doMock('@/features/auth/services/authService', () => ({ authService: authServiceMock }));
  jest.doMock('@/services/api', () => ({
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
    queryClient: queryClientMock,
    setUnauthorizedHandler,
  }));
  jest.doMock('@/services/storage/secureStorage', () => ({ tokenStorage: tokenStorageMock }));
  jest.doMock('@/navigation/navigationRef', () => ({ navigationRef: navigationRefMock }));
  jest.doMock('@/state/resetUserData', () => ({
    registerUserDataReset: jest.fn(),
    resetUserData: resetUserDataMock,
  }));

  const session =
    require('@/features/auth/services/sessionService') as typeof import('@/features/auth/services/sessionService');
  const { useAuthStore } =
    require('@/state/auth/authStore') as typeof import('@/state/auth/authStore');
  const { useUserProfileStore } =
    require('@/state/user/userProfileStore') as typeof import('@/state/user/userProfileStore');
  // Cùng registry với isApiError của sessionService để instanceof đúng sau jest.resetModules().
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return {
    session,
    useAuthStore,
    useUserProfileStore,
    ApiError,
    authServiceMock,
    healthMock,
    tokenStorageMock,
    queryClientMock,
    setUnauthorizedHandler,
    navigationRefMock,
    resetUserDataMock,
  };
}

describe('openSession', () => {
  test('chưa có hồ sơ sức khỏe → phải làm Health Profile, không gọi BE', async () => {
    const { session, healthMock } = load();

    const result = await session.openSession({ ...USER, hasCompletedSurvey: false });

    expect(result.needsSurvey).toBe(true);
    expect(healthMock.getHealthProfile).not.toHaveBeenCalled();
  });

  test('đã có hồ sơ → nạp vào userProfileStore trước khi vào Main', async () => {
    const { session, healthMock, useUserProfileStore } = load();
    healthMock.getHealthProfile.mockResolvedValue(HYDRATED);

    const result = await session.openSession(USER);

    expect(healthMock.getHealthProfile).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ user: USER, needsSurvey: false });
    expect(useUserProfileStore.getState()).toMatchObject({
      weightKg: 55,
      goal: 'lose',
      allergyIds: ['peanut'],
      dietaryPreferenceIds: ['vegan'],
    });
  });

  test('bản mock/không có gì để nạp (null) → giữ nguyên store', async () => {
    const { session, healthMock, useUserProfileStore } = load();
    healthMock.getHealthProfile.mockResolvedValue(null);

    const result = await session.openSession(USER);

    expect(result.needsSurvey).toBe(false);
    expect(useUserProfileStore.getState().weightKg).toBe(0);
  });

  test('nạp hồ sơ lỗi → ném lỗi (đăng nhập không được coi là xong)', async () => {
    const { session, healthMock } = load();
    const error = new Error('mất mạng');
    healthMock.getHealthProfile.mockRejectedValue(error);

    await expect(session.openSession(USER)).rejects.toBe(error);
  });
});

describe('bootstrapSession', () => {
  test('chế độ mock → ready ngay, không đọc token', async () => {
    const { session, useAuthStore, tokenStorageMock } = load(true);

    await session.bootstrapSession();

    expect(useAuthStore.getState().bootstrapStatus).toBe('ready');
    expect(tokenStorageMock.get).not.toHaveBeenCalled();
  });

  test('chưa có token → ready, chưa đăng nhập (đi Welcome), không gọi API', async () => {
    const { session, useAuthStore, tokenStorageMock, authServiceMock } = load();
    tokenStorageMock.get.mockResolvedValue(null);

    await session.bootstrapSession();

    expect(useAuthStore.getState()).toMatchObject({
      bootstrapStatus: 'ready',
      isAuthenticated: false,
      pendingUser: null,
      lastExitReason: null,
    });
    expect(authServiceMock.getMe).not.toHaveBeenCalled();
  });

  test('token hợp lệ + đã có hồ sơ → đăng nhập, store đã được nạp', async () => {
    const { session, useAuthStore, useUserProfileStore, tokenStorageMock, authServiceMock, healthMock } =
      load();
    tokenStorageMock.get.mockResolvedValue('jwt');
    authServiceMock.getMe.mockResolvedValue(USER);
    healthMock.getHealthProfile.mockResolvedValue(HYDRATED);

    await session.bootstrapSession();

    expect(useAuthStore.getState()).toMatchObject({
      bootstrapStatus: 'ready',
      isAuthenticated: true,
      user: USER,
    });
    expect(useUserProfileStore.getState().weightKg).toBe(55);
  });

  test('token hợp lệ nhưng chưa làm khảo sát → onboarding (pendingUser), chưa vào Main', async () => {
    const { session, useAuthStore, tokenStorageMock, authServiceMock, healthMock } = load();
    const newUser = { ...USER, hasCompletedSurvey: false };
    tokenStorageMock.get.mockResolvedValue('jwt');
    authServiceMock.getMe.mockResolvedValue(newUser);

    await session.bootstrapSession();

    expect(useAuthStore.getState()).toMatchObject({
      bootstrapStatus: 'ready',
      isAuthenticated: false,
      pendingUser: newUser,
    });
    expect(healthMock.getHealthProfile).not.toHaveBeenCalled();
  });

  test.each([
    ['401 (token hết hạn/bị thu hồi)', 'UNAUTHORIZED', 401],
    ['404 (tài khoản không còn)', 'NOT_FOUND', 404],
  ] as const)('/auth/me %s → xóa token và mở Login', async (_label, code, status) => {
    const { session, useAuthStore, tokenStorageMock, authServiceMock, ApiError } = load();
    tokenStorageMock.get.mockResolvedValue('jwt');
    authServiceMock.getMe.mockRejectedValue(new ApiError('Hết hạn', code, status));

    await session.bootstrapSession();

    expect(tokenStorageMock.clear).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      bootstrapStatus: 'ready',
      isAuthenticated: false,
      lastExitReason: 'expired',
    });
  });

  test.each([
    ['mất mạng', 'NETWORK', null],
    ['quá thời gian', 'TIMEOUT', null],
    ['máy chủ lỗi', 'SERVER', 500],
  ] as const)('/auth/me %s → failed, GIỮ token để thử lại', async (_label, code, status) => {
    const { session, useAuthStore, tokenStorageMock, authServiceMock, ApiError } = load();
    tokenStorageMock.get.mockResolvedValue('jwt');
    authServiceMock.getMe.mockRejectedValue(new ApiError('Lỗi', code, status));

    await session.bootstrapSession();

    expect(tokenStorageMock.clear).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      bootstrapStatus: 'failed',
      isAuthenticated: false,
      lastExitReason: null,
    });
  });

  test('nạp hồ sơ lỗi mạng sau khi /auth/me thành công → failed, chưa đăng nhập', async () => {
    const { session, useAuthStore, tokenStorageMock, authServiceMock, healthMock, ApiError } = load();
    tokenStorageMock.get.mockResolvedValue('jwt');
    authServiceMock.getMe.mockResolvedValue(USER);
    healthMock.getHealthProfile.mockRejectedValue(new ApiError('Mất mạng', 'NETWORK'));

    await session.bootstrapSession();

    expect(tokenStorageMock.clear).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      bootstrapStatus: 'failed',
      isAuthenticated: false,
    });
  });

  test('thử lại sau khi failed → ready và đăng nhập', async () => {
    const { session, useAuthStore, tokenStorageMock, authServiceMock, healthMock, ApiError } = load();
    tokenStorageMock.get.mockResolvedValue('jwt');
    authServiceMock.getMe
      .mockRejectedValueOnce(new ApiError('Mất mạng', 'NETWORK'))
      .mockResolvedValueOnce(USER);
    healthMock.getHealthProfile.mockResolvedValue(HYDRATED);

    await session.bootstrapSession();
    expect(useAuthStore.getState().bootstrapStatus).toBe('failed');

    await session.bootstrapSession();
    expect(useAuthStore.getState()).toMatchObject({ bootstrapStatus: 'ready', isAuthenticated: true });
  });
});

describe('handleSessionExpired', () => {
  test('đang đăng nhập → xóa token + cache và mở màn "Phiên hết hạn", chưa logout', async () => {
    const { session, useAuthStore, tokenStorageMock, queryClientMock, navigationRefMock } = load();
    useAuthStore.getState().login(USER);

    session.handleSessionExpired();
    await flushPromises();

    expect(tokenStorageMock.clear).toHaveBeenCalledTimes(1);
    expect(queryClientMock.cancelQueries).toHaveBeenCalledTimes(1);
    expect(queryClientMock.clear).toHaveBeenCalledTimes(1);
    expect(navigationRefMock.navigate).toHaveBeenCalledWith('Main', {
      screen: 'StateSession',
      params: { variant: 'expired' },
    });
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, sessionExpired: true });
  });

  test('nhiều request cùng 401 → chỉ xử lý một lần', async () => {
    const { session, useAuthStore, tokenStorageMock, navigationRefMock } = load();
    useAuthStore.getState().login(USER);

    session.handleSessionExpired();
    session.handleSessionExpired();
    session.handleSessionExpired();
    await flushPromises();

    expect(navigationRefMock.navigate).toHaveBeenCalledTimes(1);
    expect(tokenStorageMock.clear).toHaveBeenCalledTimes(1);
  });

  test('chưa đăng nhập (đang khôi phục phiên, Guest, sai mật khẩu) → bỏ qua', async () => {
    const { session, useAuthStore, tokenStorageMock, navigationRefMock } = load();

    session.handleSessionExpired();
    useAuthStore.getState().continueAsGuest();
    session.handleSessionExpired();
    await flushPromises();

    expect(tokenStorageMock.clear).not.toHaveBeenCalled();
    expect(navigationRefMock.navigate).not.toHaveBeenCalled();
  });

  test('navigation chưa sẵn sàng → về Login ngay (logout expired)', async () => {
    const { session, useAuthStore, navigationRefMock } = load();
    navigationRefMock.isReady.mockReturnValue(false);
    useAuthStore.getState().login(USER);

    session.handleSessionExpired();
    await flushPromises();

    expect(navigationRefMock.navigate).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      lastExitReason: 'expired',
    });
  });

  test('đăng nhập lại sau khi hết hạn mở lại cờ để lần hết hạn sau vẫn được xử lý', async () => {
    const { session, useAuthStore, navigationRefMock } = load();
    useAuthStore.getState().login(USER);
    session.handleSessionExpired();

    useAuthStore.getState().logout('expired');
    useAuthStore.getState().login(USER);
    session.handleSessionExpired();
    await flushPromises();

    expect(navigationRefMock.navigate).toHaveBeenCalledTimes(2);
  });
});

describe('startSessionLifecycle', () => {
  test('đăng ký handler 401 và hủy được', () => {
    const { session, setUnauthorizedHandler } = load();

    const stop = session.startSessionLifecycle();
    expect(setUnauthorizedHandler).toHaveBeenLastCalledWith(session.handleSessionExpired);

    stop();
    expect(setUnauthorizedHandler).toHaveBeenCalledTimes(2);
  });

  test('đăng xuất → xóa token, cache và dữ liệu người dùng cục bộ', async () => {
    const { session, useAuthStore, tokenStorageMock, queryClientMock, resetUserDataMock } = load();
    session.startSessionLifecycle();
    useAuthStore.getState().login(USER);
    expect(resetUserDataMock).not.toHaveBeenCalled();

    useAuthStore.getState().logout();
    await flushPromises();

    expect(tokenStorageMock.clear).toHaveBeenCalledTimes(1);
    expect(queryClientMock.cancelQueries).toHaveBeenCalledTimes(1);
    expect(queryClientMock.clear).toHaveBeenCalledTimes(1);
    expect(resetUserDataMock).toHaveBeenCalledTimes(1);
  });

  test('"Đăng nhập lại" sau khi hết hạn cũng dọn dữ liệu của phiên cũ', async () => {
    const { session, useAuthStore, resetUserDataMock } = load();
    session.startSessionLifecycle();
    useAuthStore.getState().login(USER);

    useAuthStore.getState().logout('expired');
    await flushPromises();

    expect(resetUserDataMock).toHaveBeenCalledTimes(1);
  });

  test('thoát Guest và thoát onboarding (pendingUser) cũng được coi là kết thúc phiên', async () => {
    const { session, useAuthStore, resetUserDataMock } = load();
    session.startSessionLifecycle();

    useAuthStore.getState().continueAsGuest();
    useAuthStore.getState().logout('guest');
    useAuthStore.getState().setPendingUser({ ...USER, hasCompletedSurvey: false });
    useAuthStore.getState().logout();
    await flushPromises();

    expect(resetUserDataMock).toHaveBeenCalledTimes(2);
  });

  test('đăng nhập, hoàn tất onboarding (pendingUser → login) và đổi trạng thái khác không dọn gì', async () => {
    const { session, useAuthStore, tokenStorageMock, resetUserDataMock } = load();
    session.startSessionLifecycle();

    useAuthStore.getState().setPendingUser({ ...USER, hasCompletedSurvey: false });
    useAuthStore.getState().login(USER);
    useAuthStore.getState().updateUser({ fullName: 'Tên mới' });
    useAuthStore.getState().setBootstrapStatus('ready');
    await flushPromises();

    expect(tokenStorageMock.clear).not.toHaveBeenCalled();
    expect(resetUserDataMock).not.toHaveBeenCalled();
  });

  test('chế độ mock → không đăng ký gì, đăng xuất giữ hành vi cũ', async () => {
    const { session, useAuthStore, setUnauthorizedHandler, tokenStorageMock, resetUserDataMock } =
      load(true);
    const stop = session.startSessionLifecycle();
    useAuthStore.getState().login(USER);

    useAuthStore.getState().logout();
    await flushPromises();
    stop();

    expect(setUnauthorizedHandler).not.toHaveBeenCalled();
    expect(tokenStorageMock.clear).not.toHaveBeenCalled();
    expect(resetUserDataMock).not.toHaveBeenCalled();
  });

  test('sau khi hủy không còn phản ứng với đăng xuất', async () => {
    const { session, useAuthStore, resetUserDataMock } = load();
    const stop = session.startSessionLifecycle();
    useAuthStore.getState().login(USER);
    stop();

    useAuthStore.getState().logout();
    await flushPromises();

    expect(resetUserDataMock).not.toHaveBeenCalled();
  });
});
