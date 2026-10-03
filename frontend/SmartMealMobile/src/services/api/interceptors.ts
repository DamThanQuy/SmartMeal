import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  refreshTokenStorage,
  saveSessionTokens,
  tokenStorage,
} from '@/services/storage/secureStorage';
import type { ApiEnvelope } from '@/types/api';
import { toApiError, type ApiError } from './errors';

/** Cấu hình request mở rộng: `skipAuth` bỏ Bearer, `retriedAfterRefresh` chống thử lại vô hạn. */
declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
    retriedAfterRefresh?: boolean;
  }
}

let onUnauthorized: () => void = () => {};

/**
 * Đăng ký từ App.tsx để tránh import vòng (interceptor ↔ authStore ↔ queryClient). Handler chỉ
 * được gọi khi một request CÓ gắn token nhận 401 mà KHÔNG thể làm mới phiên (hết hạn thật) — xem
 * sessionService.
 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// 401 ở các endpoint này nghĩa là sai thông tin/mã (không phải hết phiên) hoặc không cần phiên.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/resend-otp',
  '/auth/verify-otp',
  '/auth/reset-password',
];

const REFRESH_PATH = '/auth/refresh';

interface RefreshedTokens {
  token: string;
  refreshToken: string;
}

type RefreshOutcome =
  | { kind: 'refreshed'; token: string }
  /** Refresh token thiếu/sai/đã dùng/hết hạn → phiên thật sự đã hết. */
  | { kind: 'invalid' }
  /** Mất mạng/máy chủ lỗi → chưa biết phiên còn hay không, KHÔNG đăng xuất. */
  | { kind: 'unavailable'; error: ApiError };

// Nhiều request cùng nhận 401 chỉ gọi /auth/refresh MỘT lần (refresh token dùng một lần, gọi song
// song sẽ làm các lần sau bị từ chối); các request còn lại chờ kết quả rồi thử lại với token mới.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function performRefresh(client: AxiosInstance): Promise<RefreshOutcome> {
  const refreshToken = await refreshTokenStorage.get();
  if (!refreshToken) return { kind: 'invalid' };

  try {
    const response = await client.post<ApiEnvelope<RefreshedTokens>>(
      REFRESH_PATH,
      { refreshToken },
      { skipAuth: true },
    );
    const body = response.data;
    if (!body.success || !body.data?.token || !body.data.refreshToken) return { kind: 'invalid' };

    await saveSessionTokens({ token: body.data.token, refreshToken: body.data.refreshToken });
    return { kind: 'refreshed', token: body.data.token };
  } catch (error) {
    const apiError = toApiError(error);
    // 401/400: token sai hoặc đã dùng. Còn lại (mạng, 5xx, 429...) là lỗi tạm thời.
    if (apiError.status === 401 || apiError.status === 400) return { kind: 'invalid' };
    return { kind: 'unavailable', error: apiError };
  }
}

function refreshSession(client: AxiosInstance): Promise<RefreshOutcome> {
  refreshInFlight ??= performRefresh(client).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export function installInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(async config => {
    if (config.skipAuth) return config;
    const token = await tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const config: InternalAxiosRequestConfig | undefined = error.config;
      const url = config?.url ?? '';
      const hadToken = Boolean(config?.headers?.Authorization);
      const isPublicAuthPath = PUBLIC_AUTH_PATHS.some(path => url.endsWith(path));
      const isSessionExpiry = error.response?.status === 401 && hadToken && !isPublicAuthPath;
      // Guest (không token) gặp 401 cũng không phải hết phiên.
      if (!isSessionExpiry || !config) return Promise.reject(toApiError(error));

      if (!config.retriedAfterRefresh) {
        const outcome = await refreshSession(client);
        if (outcome.kind === 'refreshed') {
          // Gửi lại đúng request vừa bị từ chối, một lần duy nhất (request interceptor tự gắn token mới).
          return client.request({ ...config, retriedAfterRefresh: true });
        }
        if (outcome.kind === 'unavailable') return Promise.reject(outcome.error);
      }

      onUnauthorized();
      return Promise.reject(toApiError(error));
    },
  );
}
