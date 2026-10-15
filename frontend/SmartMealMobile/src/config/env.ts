/**
 * Cấu hình môi trường — nguồn duy nhất cho base URL/timeout, không hard-code rải rác
 * (docs/structure_system.md mục 7). Giá trị đọc từ biến EXPO_PUBLIC_* (file `.env`, xem
 * `.env.example`); đổi `.env` xong phải restart Metro: `npx expo start --clear`.
 *
 * Phải viết nguyên văn `process.env.EXPO_PUBLIC_*` — Metro chỉ inline được dạng này (không
 * destructure, không dùng key động). Chỉ đặt biến công khai ở đây, KHÔNG đặt secret.
 */
import Constants from 'expo-constants';

export type AppEnv = 'development' | 'staging' | 'production';

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const IPV4_OR_LOCALHOST = /^(?:\d{1,3}\.){3}\d{1,3}$|^localhost$/;

/**
 * URL backend (đã gồm `/api`): EXPO_PUBLIC_API_URL nếu có đặt; không thì khi chạy dev qua Expo, lấy host của
 * máy đang chạy Metro (hostUri "192.168.100.6:8081" — cũng là máy chạy backend) + cổng API, để điện thoại cùng
 * mạng với máy tính tự gọi đúng IP mà không phải sửa `.env` mỗi lần đổi Wi-Fi. Tunnel (*.exp.direct) không trỏ
 * tới máy tính nên bỏ qua.
 */
export function resolveApiBaseUrl(
  explicitUrl: string | undefined,
  devServerHostUri: string | undefined,
  apiPort: number,
): string {
  if (explicitUrl?.trim()) return explicitUrl.trim();
  const host = devServerHostUri?.split(':')[0];
  if (host && IPV4_OR_LOCALHOST.test(host)) return `http://${host}:${apiPort}/api`;
  return `http://localhost:${apiPort}/api`;
}

export const ENV = {
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv,
  /** URL backend, ĐÃ gồm hậu tố `/api` (docs/fetch-api/part1 §3.1 — bảng theo môi trường chạy). */
  apiBaseUrl: resolveApiBaseUrl(
    process.env.EXPO_PUBLIC_API_URL,
    Constants.expoConfig?.hostUri,
    readPositiveNumber(process.env.EXPO_PUBLIC_API_PORT, 5000),
  ),
  apiTimeoutMs: readPositiveNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 15000),
  /** Gemini có thể mất 5–20s nên các endpoint /ai/* dùng timeout dài hơn. */
  aiTimeoutMs: readPositiveNumber(process.env.EXPO_PUBLIC_AI_TIMEOUT_MS, 60000),
  /**
   * Mặc định là true (dùng mock) trừ khi chỉ định rõ EXPO_PUBLIC_USE_MOCK_API=false,
   * giúp app chạy mượt mà ngay cả khi chưa khởi động server backend ASP.NET Core.
   */
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false',
} as const;
