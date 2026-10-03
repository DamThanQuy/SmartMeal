import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { API_STORAGE_KEYS } from '@/constants/api';
import { ENV } from '@/config/env';
import { secureStorage } from '@/services/storage/secureStorage';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: string[] | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK' | 'TIMEOUT' | 'HTTP' | 'API',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = axios.create({
  baseURL: ENV.apiBaseUrl,
  timeout: ENV.apiTimeoutMs,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use(async config => {
  const token = await secureStorage.getString(API_STORAGE_KEYS.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error instanceof AxiosError) {
      if (!error.response) {
        throw new ApiError(
          error.code === 'ECONNABORTED' ? 'Kết nối quá thời gian.' : 'Không thể kết nối máy chủ.',
          error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK',
        );
      }
      const payload = error.response.data as Partial<ApiEnvelope<unknown>> | undefined;
      throw new ApiError(
        payload?.message ?? 'Yêu cầu không thành công.',
        'HTTP',
        error.response.status,
      );
    }
    throw error;
  },
);

export function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const envelope = response.data;
  if (!envelope.success || envelope.data === null) {
    throw new ApiError(envelope.message || 'API trả về dữ liệu không hợp lệ.', 'API');
  }
  return envelope.data;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  return unwrap(await apiClient.request<ApiEnvelope<T>>(config));
}