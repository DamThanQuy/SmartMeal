import { ENV } from './env';

/**
 * Config cho src/services/api/client.ts khi nối API thật (chưa được dùng trên nhánh
 * feat/mock-ui — xem CLAUDE.md mục 8). Tách khỏi env.ts vì đây là config riêng cho tầng
 * HTTP client (timeout/retry), không phải biến môi trường chung.
 */
export const API_CONFIG = {
  baseURL: ENV.apiBaseUrl,
  timeout: ENV.apiTimeoutMs,
} as const;
