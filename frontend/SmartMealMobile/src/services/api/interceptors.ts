import type { AxiosError, AxiosInstance } from 'axios';
import { tokenStorage } from '@/services/storage/secureStorage';
import { toApiError } from './errors';

let onUnauthorized: () => void = () => {};

/**
 * Đăng ký từ App.tsx để tránh import vòng (interceptor ↔ authStore ↔ queryClient). Handler chỉ
 * được gọi khi một request CÓ gắn token nhận 401 (hết phiên) — xem sessionService.
 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// 401 ở các endpoint này nghĩa là sai thông tin đăng nhập, KHÔNG phải hết phiên.
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/google'];

export function installInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(async config => {
    const token = await tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      const url = error.config?.url ?? '';
      const hadToken = Boolean(error.config?.headers?.Authorization);
      const isPublicAuthPath = PUBLIC_AUTH_PATHS.some(path => url.endsWith(path));
      // Guest (không token) gặp 401 cũng không phải hết phiên.
      if (error.response?.status === 401 && hadToken && !isPublicAuthPath) {
        onUnauthorized();
      }
      return Promise.reject(toApiError(error));
    },
  );
}
