/**
 * getFreshAccessToken: kết nối real-time (WebSocket) không đi qua interceptor nên phải tự lấy token còn hạn — sắp hết
 * hạn thì làm mới trước (dùng chung /auth/refresh), refresh token hết thì xử lý hết phiên, mất mạng thì ném lỗi để thử lại.
 */
import {
  AxiosError,
  create as createAxiosInstance,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getFreshAccessToken, setUnauthorizedHandler } from '@/services/api/interceptors';

const mockGetToken = jest.fn<Promise<string | null>, []>();
const mockGetRefreshToken = jest.fn<Promise<string | null>, []>();
const mockSaveTokens = jest.fn<Promise<void>, [{ token: string; refreshToken?: string | null }]>();

jest.mock('@/services/storage/secureStorage', () => ({
  tokenStorage: { get: () => mockGetToken() },
  refreshTokenStorage: { get: () => mockGetRefreshToken() },
  saveSessionTokens: (tokens: { token: string; refreshToken?: string | null }) => mockSaveTokens(tokens),
}));

/** JWT (không cần chữ ký thật) hết hạn sau `secondsLeft` giây. */
function jwt(secondsLeft: number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + secondsLeft;
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'u-1', name: 'Nguyễn Văn A', exp })}.sig`;
}

function clientResponding(respond: (config: InternalAxiosRequestConfig) => AxiosResponse | AxiosError) {
  const calls: string[] = [];
  const adapter: AxiosAdapter = async config => {
    calls.push(config.url ?? '');
    const result = respond(config);
    if (result instanceof AxiosError) throw result;
    return result;
  };
  return { client: createAxiosInstance({ baseURL: 'http://test/api', adapter }), calls };
}

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { status: 200, data, statusText: 'OK', headers: {}, config };
}

function failure(config: InternalAxiosRequestConfig, status?: number): AxiosError {
  const response = status ? ({ status, data: '', statusText: '', headers: {}, config } as AxiosResponse) : undefined;
  return new AxiosError('Request failed', status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK', config, undefined, response);
}

describe('getFreshAccessToken', () => {
  const unauthorized = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRefreshToken.mockResolvedValue('refresh-1');
    mockSaveTokens.mockResolvedValue(undefined);
    setUnauthorizedHandler(unauthorized);
  });

  test('token còn hạn → dùng luôn, không gọi /auth/refresh', async () => {
    const token = jwt(30 * 60);
    mockGetToken.mockResolvedValue(token);
    const { client, calls } = clientResponding(config => ok(config, {}));

    await expect(getFreshAccessToken(client)).resolves.toBe(token);
    expect(calls).toEqual([]);
  });

  test('token sắp hết hạn → làm mới trước rồi trả token mới', async () => {
    mockGetToken.mockResolvedValue(jwt(20));
    const { client, calls } = clientResponding(config =>
      ok(config, { success: true, message: 'ok', data: { token: 'new-token', refreshToken: 'refresh-2' }, errors: null }),
    );

    await expect(getFreshAccessToken(client)).resolves.toBe('new-token');
    expect(calls).toEqual(['/auth/refresh']);
    expect(mockSaveTokens).toHaveBeenCalledWith({ token: 'new-token', refreshToken: 'refresh-2' });
  });

  test('refresh token không còn dùng được → xử lý hết phiên và ném lỗi', async () => {
    mockGetToken.mockResolvedValue(jwt(-60));
    const { client } = clientResponding(config => failure(config, 401));

    await expect(getFreshAccessToken(client)).rejects.toThrow();
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  test('mất mạng khi làm mới → ném lỗi để thử lại sau, KHÔNG đăng xuất', async () => {
    mockGetToken.mockResolvedValue(jwt(10));
    const { client } = clientResponding(config => failure(config));

    await expect(getFreshAccessToken(client)).rejects.toThrow();
    expect(unauthorized).not.toHaveBeenCalled();
  });

  test('chưa đăng nhập → ném lỗi', async () => {
    mockGetToken.mockResolvedValue(null);
    const { client } = clientResponding(config => ok(config, {}));

    await expect(getFreshAccessToken(client)).rejects.toThrow();
  });
});
