/// <reference types="node" />
/**
 * Hạ tầng cho test "live": chạy service THẬT của app (axios + interceptor + mapper) với backend ASP.NET
 * đang chạy, thay vì mock. Đặt ngoài __tests__ để Jest không coi là file test.
 *
 * Bật bằng biến môi trường (không đặt thì mọi `describeLive` tự bỏ qua, `npm test` vẫn xanh):
 *   LIVE_API_URL=http://127.0.0.1:5099/api   — URL backend, đã gồm /api
 *   LIVE_BE_LOG=/đường/dẫn/log-của-backend   — để đọc mã OTP backend ghi ra log ở Development (SMTP chưa cấu hình)
 *
 * Cách dùng trong test: gọi `installLiveBackend()` trong beforeAll, SAU ĐÓ mới `require` các service
 * (cấu hình env của app được đọc lúc import).
 */
import { readFileSync } from 'fs';
import http from 'http';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const LIVE_API_URL = process.env.LIVE_API_URL;
export const describeLive = LIVE_API_URL ? describe : describe.skip;

/**
 * Adapter axios dùng `http` của Node. Axios trong môi trường Jest của React Native chọn adapter XHR
 * của RN (đi qua module native đã bị mock nên không ra mạng thật).
 */
const nodeHttpAdapter: AxiosAdapter = config =>
  new Promise((resolve, reject) => {
    const { AxiosError, AxiosHeaders } = require('axios') as typeof import('axios');
    const base = (config.baseURL ?? '').replace(/\/$/, '');
    const target = new URL(config.url?.startsWith('http') ? config.url : `${base}${config.url ?? ''}`);
    for (const [key, value] of Object.entries(config.params ?? {})) {
      if (value !== undefined && value !== null) target.searchParams.append(key, String(value));
    }

    const headers = AxiosHeaders.from(config.headers).toJSON() as Record<string, string>;
    const body = config.data === undefined || config.data === null ? undefined : String(config.data);
    if (body !== undefined) headers['Content-Length'] = String(Buffer.byteLength(body));

    const request = http.request(
      target,
      { method: (config.method ?? 'get').toUpperCase(), headers },
      incoming => {
        const chunks: Buffer[] = [];
        incoming.on('data', chunk => chunks.push(chunk as Buffer));
        incoming.on('end', () => {
          const response: AxiosResponse = {
            data: Buffer.concat(chunks).toString('utf8'),
            status: incoming.statusCode ?? 0,
            statusText: incoming.statusMessage ?? '',
            headers: incoming.headers as AxiosResponse['headers'],
            config: config as InternalAxiosRequestConfig,
            request,
          };
          const valid = config.validateStatus ? config.validateStatus(response.status) : true;
          if (valid) {
            resolve(response);
            return;
          }
          reject(
            new AxiosError(
              `Request failed with status code ${response.status}`,
              response.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
              config as InternalAxiosRequestConfig,
              request,
              response,
            ),
          );
        });
      },
    );
    request.on('error', error =>
      reject(new AxiosError(error.message, 'ERR_NETWORK', config as InternalAxiosRequestConfig, request)),
    );
    if (config.timeout) {
      request.setTimeout(config.timeout, () => {
        request.destroy();
        reject(new AxiosError('timeout', 'ECONNABORTED', config as InternalAxiosRequestConfig, request));
      });
    }
    if (body !== undefined) request.write(body);
    request.end();
  });

/** Kho SecureStore trong bộ nhớ (module thật cần keychain native). */
export function createMemorySecureStore() {
  const values = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

/**
 * Chuẩn bị môi trường: app gọi API thật (EXPO_PUBLIC_USE_MOCK_API=false) tới LIVE_API_URL, axios dùng
 * adapter Node, SecureStore/AsyncStorage chạy trong bộ nhớ. Gọi TRƯỚC khi require service của app.
 */
export function installLiveBackend(): void {
  process.env.EXPO_PUBLIC_USE_MOCK_API = 'false';
  process.env.EXPO_PUBLIC_API_URL = LIVE_API_URL;
  jest.resetModules();
  jest.doMock('expo-secure-store', () => createMemorySecureStore());
  jest.doMock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
  );
  const axios = require('axios') as typeof import('axios');
  axios.default.defaults.adapter = nodeHttpAdapter;
}

/** Email duy nhất cho mỗi lần chạy để test không dẫm lên dữ liệu của lần trước. */
export function uniqueEmail(prefix = 'live'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Mã OTP gần nhất gửi tới `email` — backend ở Development (SMTP chưa cấu hình) ghi cả nội dung email
 * ra log: "[DEV EMAIL …] To: <email> | Subject: …" rồi nội dung có mã 6 số.
 */
export function readLatestOtp(email: string): string {
  const logPath = process.env.LIVE_BE_LOG;
  if (!logPath) throw new Error('Đặt LIVE_BE_LOG để đọc mã OTP từ log của backend.');
  const log = readFileSync(logPath, 'utf8');
  const marker = log.lastIndexOf(`To: ${email}`);
  if (marker < 0) throw new Error(`Không thấy email nào gửi tới ${email} trong log backend.`);
  const match = /\b(\d{6})\b/.exec(log.slice(marker));
  if (!match) throw new Error(`Email gửi tới ${email} không có mã 6 số.`);
  return match[1];
}
