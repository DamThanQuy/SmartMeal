import { create as createAxiosInstance, type AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/config/api';
import type { ApiEnvelope } from '@/types/api';
import { getFreshAccessToken, installInterceptors } from './interceptors';
import { ApiError } from './errors';

export type { ApiEnvelope } from '@/types/api';
export { ApiError } from './errors';

export const apiClient = createAxiosInstance({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: { Accept: 'application/json' },
});

installInterceptors(apiClient);

/** Token còn hạn cho kết nối real-time (SignalR) — xem interceptors.getFreshAccessToken. */
export function getAccessTokenForRealtime(): Promise<string> {
  return getFreshAccessToken(apiClient);
}

export function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const envelope = response.data;
  if (!envelope.success || envelope.data === null) {
    throw new ApiError(envelope.message || 'API trả về dữ liệu không hợp lệ.', 'BUSINESS');
  }
  return envelope.data;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  return unwrap(await apiClient.request<ApiEnvelope<T>>(config));
}
