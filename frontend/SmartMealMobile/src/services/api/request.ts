import type { AxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '@/types/api';
import { apiClient } from './client';
import { unwrap } from './unwrap';

/**
 * Helper gọi API + bóc envelope trong một bước — feature service dùng thay vì tự gọi
 * `apiClient` rồi `unwrap`. Lỗi luôn là ApiError (interceptor + unwrap chuẩn hóa).
 */
export const api = {
  async get<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> {
    return unwrap(await apiClient.get<ApiEnvelope<TResponse>>(url, config));
  },

  async post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    return unwrap(await apiClient.post<ApiEnvelope<TResponse>>(url, body, config));
  },

  async put<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    return unwrap(await apiClient.put<ApiEnvelope<TResponse>>(url, body, config));
  },

  async patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    return unwrap(await apiClient.patch<ApiEnvelope<TResponse>>(url, body, config));
  },

  async delete<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> {
    return unwrap(await apiClient.delete<ApiEnvelope<TResponse>>(url, config));
  },
};
