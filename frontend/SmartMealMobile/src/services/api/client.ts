import { create as createAxiosInstance } from 'axios';
import { API_CONFIG } from '@/config/api';
import { installInterceptors } from './interceptors';

/**
 * Axios instance duy nhất của app (.claude/rules/state-and-api.md) — không import `axios` ở nơi
 * khác ngoài src/services/api. `baseURL` đã gồm `/api` nên đường dẫn trong ENDPOINTS chỉ bắt đầu
 * bằng `/auth/login`…
 */
export const apiClient = createAxiosInstance({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: { Accept: 'application/json' },
});

installInterceptors(apiClient);
