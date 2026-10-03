import { ENV } from '@/config/env';
import { MAIN_STACK_ROUTES, ROOT_ROUTES } from '@/constants/routes';
import { healthProfileService } from '@/features/health';
import { navigationRef } from '@/navigation/navigationRef';
import { isApiError, queryClient, setUnauthorizedHandler } from '@/services/api';
import { tokenStorage } from '@/services/storage/secureStorage';
import { type AuthState, useAuthStore } from '@/state/auth/authStore';
import { resetUserData } from '@/state/resetUserData';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import type { AuthUser, SessionOpenResult } from '../types/auth.types';
import { authService } from './authService';

// Vòng đời phiên đăng nhập (docs/fetch-api/part1 §4.7): khôi phục khi khởi động, mở phiên sau khi
// đăng nhập, xử lý hết hạn (401) và dọn dữ liệu khi đăng xuất. Token chỉ ở SecureStore.

/**
 * Sau khi đã có token + user (đăng nhập hoặc khôi phục phiên): nạp hồ sơ sức khỏe vào
 * userProfileStore (bản sao đồng bộ cho các service lọc dị ứng...) rồi báo có cần làm Health
 * Profile không. Phải xong TRƯỚC khi vào Main để màn hình không bao giờ thấy store rỗng.
 */
export async function openSession(user: AuthUser): Promise<SessionOpenResult> {
  if (!user.hasCompletedSurvey) return { user, needsSurvey: true };

  const hydrated = await healthProfileService.getHealthProfile(user.id);
  if (hydrated) {
    useUserProfileStore.getState().hydrateFromServer(hydrated.snapshot, hydrated.extras);
  }
  return { user, needsSurvey: false };
}

/**
 * Khởi động app: đọc token → GET /auth/me → nạp hồ sơ → quyết định Welcome/onboarding/Main.
 * Kết quả ghi vào authStore (bootstrapStatus); AppNavigator giữ splash cho tới khi xong.
 * - Không có token → chưa đăng nhập.
 * - 401/404 từ /auth/me (token hết hạn/thu hồi, tài khoản không còn) → xóa token, mở Login.
 * - Mất mạng/timeout/lỗi máy chủ → GIỮ token, 'failed' để người dùng thử lại (không đăng xuất oan).
 */
export async function bootstrapSession(): Promise<void> {
  const auth = useAuthStore.getState();
  // Mock không có phiên nào để khôi phục.
  if (ENV.useMockApi) {
    auth.setBootstrapStatus('ready');
    return;
  }

  try {
    const token = await tokenStorage.get();
    if (!token) {
      auth.setBootstrapStatus('ready');
      return;
    }

    const user = await authService.getMe();
    const { needsSurvey } = await openSession(user);
    if (needsSurvey) {
      auth.setPendingUser(user);
    } else {
      auth.login(user);
    }
    auth.setBootstrapStatus('ready');
  } catch (error) {
    if (isApiError(error) && (error.code === 'UNAUTHORIZED' || error.code === 'NOT_FOUND')) {
      await tokenStorage.clear();
      auth.logout('expired');
      auth.setBootstrapStatus('ready');
      return;
    }
    auth.setBootstrapStatus('failed');
  }
}

async function clearSessionData(): Promise<void> {
  await tokenStorage.clear();
  await queryClient.cancelQueries();
  queryClient.clear();
}

/**
 * Một request CÓ token nhận 401 khi đang đăng nhập → phiên hết hạn. Xóa token + cache rồi mở màn
 * "Phiên hết hạn". KHÔNG gọi logout() ở đây: khi isAuthenticated=false AppNavigator sẽ unmount
 * Main nên người dùng không thấy thông báo — StateSessionScreen tự logout('expired') khi bấm
 * "Đăng nhập lại". 401 lúc khởi động (chưa vào Main) do bootstrapSession tự xử lý nên bị bỏ qua.
 */
export function handleSessionExpired(): void {
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated || auth.sessionExpired) return;

  auth.markSessionExpired();
  void clearSessionData();

  if (navigationRef.isReady()) {
    navigationRef.navigate(ROOT_ROUTES.MAIN, {
      screen: MAIN_STACK_ROUTES.STATE_SESSION,
      params: { variant: 'expired' },
    });
  } else {
    // Chưa có navigation để mở màn thông báo → về Login luôn.
    auth.logout('expired');
  }
}

function hasSession(state: AuthState): boolean {
  return state.isAuthenticated || state.isGuest || state.pendingUser !== null;
}

/**
 * Gọi 1 lần ở App.tsx: đăng ký handler 401 và tự dọn dữ liệu mỗi khi phiên kết thúc (đăng xuất
 * chủ động, "Đăng nhập lại" sau khi hết hạn, thoát Guest, xóa dữ liệu...) — dù nút đăng xuất nằm ở
 * màn nào cũng chỉ cần gọi authStore.logout(). Dọn: token, cache TanStack Query và dữ liệu người
 * dùng cục bộ (resetUserData). Chế độ mock giữ hành vi cũ (không dọn gì). Trả hàm hủy đăng ký.
 */
export function startSessionLifecycle(): () => void {
  if (ENV.useMockApi) return () => undefined;

  setUnauthorizedHandler(handleSessionExpired);
  const unsubscribe = useAuthStore.subscribe((state, previous) => {
    if (!hasSession(previous) || hasSession(state)) return;
    void clearSessionData();
    resetUserData();
  });

  return () => {
    unsubscribe();
    setUnauthorizedHandler(() => undefined);
  };
}
