/**
 * authStore (docs/fetch-api/part1 §4.7): trạng thái đăng nhập, pendingUser cho onboarding và cờ
 * khôi phục phiên. Token KHÔNG nằm trong store.
 */
import type { AuthUser } from '@/state/auth/authStore';

function loadStore(useMockApi: boolean) {
  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  return require('@/state/auth/authStore') as typeof import('@/state/auth/authStore');
}

const USER: AuthUser = {
  id: 'user-1',
  fullName: 'Nguyễn An',
  email: 'an@smartmeal.vn',
  avatarUrl: null,
  isPro: false,
  role: 'User',
  hasCompletedSurvey: true,
};

describe('trạng thái khởi tạo', () => {
  test('chạy API thật → phải khôi phục phiên (loading), chưa đăng nhập', () => {
    const { useAuthStore } = loadStore(false);

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      isGuest: false,
      user: null,
      pendingUser: null,
      bootstrapStatus: 'loading',
      sessionExpired: false,
    });
  });

  test('chạy mock → không có phiên để khôi phục (ready)', () => {
    const { useAuthStore } = loadStore(true);

    expect(useAuthStore.getState().bootstrapStatus).toBe('ready');
  });
});

describe('login / logout', () => {
  test('login đặt user, xóa pendingUser và lý do thoát gần nhất', () => {
    const { useAuthStore } = loadStore(false);
    useAuthStore.setState({ pendingUser: USER, lastExitReason: 'expired' });

    useAuthStore.getState().login(USER);

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      isGuest: false,
      user: USER,
      pendingUser: null,
      lastExitReason: null,
    });
  });

  test('logout xóa user/pendingUser, ghi lý do và mở lại cờ hết phiên', () => {
    const { useAuthStore } = loadStore(false);
    useAuthStore.getState().login(USER);
    useAuthStore.getState().markSessionExpired();

    useAuthStore.getState().logout('expired');

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      user: null,
      pendingUser: null,
      lastExitReason: 'expired',
      sessionExpired: false,
    });
  });

  test('logout mặc định là đăng xuất chủ động', () => {
    const { useAuthStore } = loadStore(false);
    useAuthStore.getState().login(USER);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().lastExitReason).toBe('logout');
  });

  test('Guest không có user thật', () => {
    const { useAuthStore } = loadStore(false);

    useAuthStore.getState().continueAsGuest();

    expect(useAuthStore.getState()).toMatchObject({ isGuest: true, isAuthenticated: false, user: null });
  });

  test('updateUser chỉ sửa họ tên và bỏ qua khi chưa đăng nhập', () => {
    const { useAuthStore } = loadStore(false);

    useAuthStore.getState().updateUser({ fullName: 'Không ai' });
    expect(useAuthStore.getState().user).toBeNull();

    useAuthStore.getState().login(USER);
    useAuthStore.getState().updateUser({ fullName: 'Tên mới' });
    expect(useAuthStore.getState().user).toEqual({ ...USER, fullName: 'Tên mới' });
  });
});

describe('getCurrentUserId', () => {
  test('ưu tiên user đã đăng nhập, rồi tới tài khoản đang onboarding, không có → null', () => {
    const { useAuthStore, getCurrentUserId } = loadStore(false);
    expect(getCurrentUserId()).toBeNull();

    useAuthStore.getState().setPendingUser({ ...USER, id: 'pending-1', hasCompletedSurvey: false });
    expect(getCurrentUserId()).toBe('pending-1');

    useAuthStore.getState().login(USER);
    expect(getCurrentUserId()).toBe('user-1');

    useAuthStore.getState().logout();
    expect(getCurrentUserId()).toBeNull();
  });
});

describe('bootstrapStatus', () => {
  test('setBootstrapStatus đổi trạng thái khôi phục phiên', () => {
    const { useAuthStore } = loadStore(false);

    useAuthStore.getState().setBootstrapStatus('failed');
    expect(useAuthStore.getState().bootstrapStatus).toBe('failed');

    useAuthStore.getState().setBootstrapStatus('ready');
    expect(useAuthStore.getState().bootstrapStatus).toBe('ready');
  });
});
