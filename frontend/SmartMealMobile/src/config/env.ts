/**
 * Cấu hình môi trường — nguồn duy nhất cho base URL/timeout, không hard-code rải rác
 * (docs/structure_system.md mục 7). Giá trị đọc từ biến EXPO_PUBLIC_* (file `.env`, xem
 * `.env.example`); đổi `.env` xong phải restart Metro: `npx expo start --clear`.
 *
 * Phải viết nguyên văn `process.env.EXPO_PUBLIC_*` — Metro chỉ inline được dạng này (không
 * destructure, không dùng key động). Chỉ đặt biến công khai ở đây, KHÔNG đặt secret.
 */
export type AppEnv = 'development' | 'staging' | 'production';

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const ENV = {
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv,
  /** URL backend, ĐÃ gồm hậu tố `/api` (docs/fetch-api/part1 §3.1 — bảng theo môi trường chạy). */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  apiTimeoutMs: readPositiveNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 15000),
  /** Gemini có thể mất 5–20s nên các endpoint /ai/* dùng timeout dài hơn. */
  aiTimeoutMs: readPositiveNumber(process.env.EXPO_PUBLIC_AI_TIMEOUT_MS, 60000),
  /**
   * true = mọi feature service dùng dữ liệu giả lập (không cần backend, MOCK_SCENARIO có tác
   * dụng); false (mặc định) = gọi API thật, hàm nào chưa nối API vẫn rơi về mock — xem
   * `selectService` (src/services/api/serviceSelector.ts).
   */
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API === 'true',
} as const;
