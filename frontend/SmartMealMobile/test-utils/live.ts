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
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const LIVE_API_URL = process.env.LIVE_API_URL;
export const describeLive = LIVE_API_URL ? describe : describe.skip;

interface RnFormDataPart {
  string?: string;
  uri?: string;
  headers: Record<string, string>;
}

/**
 * FormData của React Native (phần file là `{ uri, name, type }`) → multipart thật: đọc file từ đĩa theo
 * `file://` URI, để test live gửi được ảnh/ghi âm như app trên máy.
 */
function encodeRnFormData(data: { getParts: () => RnFormDataPart[] }): { body: Buffer; contentType: string } {
  const boundary = `----smartmeal-live-${Date.now().toString(36)}`;
  const chunks: Buffer[] = [];
  for (const part of data.getParts()) {
    const headerLines = Object.entries(part.headers).map(([key, value]) => `${key}: ${value}`);
    chunks.push(Buffer.from(`--${boundary}\r\n${headerLines.join('\r\n')}\r\n\r\n`));
    const file = part.uri ? readFileSync(part.uri.startsWith('file:') ? fileURLToPath(part.uri) : part.uri) : undefined;
    chunks.push(file ?? Buffer.from(part.string ?? ''));
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

function isRnFormData(data: unknown): data is { getParts: () => RnFormDataPart[] } {
  return typeof (data as { getParts?: unknown } | null)?.getParts === 'function';
}

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
    let body: string | Buffer | undefined;
    if (isRnFormData(config.data)) {
      const encoded = encodeRnFormData(config.data);
      body = encoded.body;
      for (const key of Object.keys(headers)) if (key.toLowerCase() === 'content-type') delete headers[key];
      headers['Content-Type'] = encoded.contentType;
    } else if (config.data !== undefined && config.data !== null) {
      body = String(config.data);
    }
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
  // Jest chạy trên Node nên FormData toàn cục là bản của Node (biến `{ uri, name, type }` thành chuỗi).
  // Dùng FormData của React Native như app trên máy để adapter gửi đúng file.
  globalThis.FormData = (require('react-native/Libraries/Network/FormData') as { default: typeof FormData }).default;
  const axios = require('axios') as typeof import('axios');
  axios.default.defaults.adapter = nodeHttpAdapter;
}

/**
 * Bật Pro cho người dùng đang đăng nhập bằng công tắc kích hoạt thử của backend Development
 * (POST /subscription/activate-mock, cần Subscription:AllowMockActivation). App không còn đường tắt này — thanh toán thật
 * phải chuyển khoản qua SePay/PayOS — nên chỉ test dùng để có tài khoản Pro. Gọi sau installLiveBackend().
 */
export async function activateProForTesting(planId: 'monthly' | 'yearly' = 'monthly'): Promise<void> {
  const { api, ENDPOINTS } = require('@/services/api') as typeof import('@/services/api');
  await api.post(ENDPOINTS.subscription.activateMock, {
    planId: planId === 'yearly' ? 'PRO_YEARLY' : 'PRO_MONTHLY',
    paymentMethod: 'SEPAY',
  });
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

/** Ảnh PNG 1×1 hợp lệ — đủ để BE nhận diện định dạng (chế độ demo không cần ảnh thật). */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** WAV PCM 16-bit mono 8 kHz, 0,25 giây im lặng. */
function silentWav(): Buffer {
  const samples = 2000;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(16000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples * 2, 40);
  return Buffer.concat([header, Buffer.alloc(samples * 2)]);
}

/** Ghi file mẫu ra thư mục tạm, trả `file://` URI như expo-image-picker/expo-audio trả trên máy. */
export function writeLiveFixture(kind: 'image' | 'audio'): string {
  const path = join(tmpdir(), `smartmeal-live-${kind}-${process.pid}.${kind === 'image' ? 'png' : 'wav'}`);
  writeFileSync(path, kind === 'image' ? Buffer.from(TINY_PNG_BASE64, 'base64') : silentWav());
  return pathToFileURL(path).href;
}
