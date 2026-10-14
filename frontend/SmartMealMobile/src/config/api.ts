import { ENV } from './env';

/**
 * Config cho src/services/api/client.ts. Tách khỏi env.ts vì đây là config riêng cho tầng
 * HTTP client (timeout/retry), không phải biến môi trường chung.
 */
export const API_CONFIG = {
  baseURL: ENV.apiBaseUrl,
  timeout: ENV.apiTimeoutMs,
  /** Timeout riêng cho các endpoint /ai/* — Gemini có thể mất 5–20s, mặc định 15s sẽ cắt giữa chừng. */
  aiTimeout: ENV.aiTimeoutMs,
  /** Tải ảnh lên (đường truyền di động chậm) — dùng chung mức dài với AI. */
  uploadTimeout: ENV.aiTimeoutMs,
} as const;
