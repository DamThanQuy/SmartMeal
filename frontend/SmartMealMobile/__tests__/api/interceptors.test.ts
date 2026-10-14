/**
 * Interceptor (docs/fetch-api/part1 §4.3): gắn Bearer token; khi request CÓ token nhận 401 thì thử
 * làm mới phiên bằng refresh token (một lần, dùng chung giữa các request song song) rồi gửi lại;
 * chỉ coi là hết phiên khi không làm mới được. 401 ở endpoint đăng nhập/đăng ký/OTP (sai thông
 * tin) hoặc của guest (không token) không phải hết phiên.
 */
import {
  AxiosError,
  create as createAxiosInstance,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiError } from '@/services/api/errors';
import { installInterceptors, setUnauthorizedHandler } from '@/services/api/interceptors';

const mockGetToken = jest.fn<Promise<string | null>, []>();
const mockGetRefreshToken = jest.fn<Promise<string | null>, []>();
const mockSaveTokens = jest.fn<Promise<void>, [{ token: string; refreshToken?: string | null }]>();

jest.mock('@/services/storage/secureStorage', () => ({
  tokenStorage: { get: () => mockGetToken() },
  refreshTokenStorage: { get: () => mockGetRefreshToken() },
  saveSessionTokens: (tokens: { token: string; refreshToken?: string | null }) =>
    mockSaveTokens(tokens),
}));

type Responder = (
  config: InternalAxiosRequestConfig,
) => AxiosResponse | AxiosError | Promise<AxiosResponse | AxiosError>;

function createClient(respond: Responder) {
  const adapter: AxiosAdapter = async config => {
    const result = await respond(config);
    if (result instanceof AxiosError) throw result;
    return result;
  };
  const client = createAxiosInstance({ baseURL: 'http://test/api', adapter });
  installInterceptors(client);
  return client;
}

function ok(config: InternalAxiosRequestConfig, data: unknown = {}): AxiosResponse {
  return { status: 200, data, statusText: 'OK', headers: {}, config };
}

function failure(config: InternalAxiosRequestConfig, status: number): AxiosError {
  const response = { status, data: '', statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response);
}

const unauthorized = (config: InternalAxiosRequestConfig) => failure(config, 401);

function tokensEnvelope(token: string, refreshToken: string) {
  return { success: true, message: 'ok', data: { token, refreshToken }, errors: null };
}

describe('installInterceptors', () => {
  const handler = jest.fn();

  beforeEach(() => {
    handler.mockReset();
    mockGetToken.mockReset();
    mockGetRefreshToken.mockReset();
    mockSaveTokens.mockReset().mockResolvedValue(undefined);
    setUnauthorizedHandler(handler);
  });

  test('gắn Authorization: Bearer <token> khi có token', async () => {
    mockGetToken.mockResolvedValue('jwt-token');
    let seenAuthorization: unknown;
    const client = createClient(config => {
      seenAuthorization = config.headers.Authorization;
      return ok(config);
    });

    await client.get('/auth/me');

    expect(seenAuthorization).toBe('Bearer jwt-token');
  });

  test('không gắn Authorization khi chưa có token', async () => {
    mockGetToken.mockResolvedValue(null);
    let seenAuthorization: unknown = 'chưa đặt';
    const client = createClient(config => {
      seenAuthorization = config.headers.Authorization;
      return ok(config);
    });

    await client.get('/recipes');

    expect(seenAuthorization).toBeUndefined();
  });

  describe('401 trên request có token', () => {
    test('làm mới phiên rồi gửi lại request bằng token mới (không báo hết phiên)', async () => {
      let currentToken = 'old-access';
      mockGetToken.mockImplementation(async () => currentToken);
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockSaveTokens.mockImplementation(async tokens => {
        currentToken = tokens.token;
      });
      const seen: { url?: string; authorization: unknown }[] = [];
      const client = createClient(config => {
        seen.push({ url: config.url, authorization: config.headers.Authorization });
        if (config.url === '/auth/refresh') return ok(config, tokensEnvelope('new-access', 'refresh-2'));
        return config.headers.Authorization === 'Bearer new-access'
          ? ok(config, { success: true, message: 'ok', data: { value: 1 }, errors: null })
          : unauthorized(config);
      });

      const response = await client.get('/nutritiondiary/daily');

      expect(response.data.data).toEqual({ value: 1 });
      expect(mockSaveTokens).toHaveBeenCalledWith({ token: 'new-access', refreshToken: 'refresh-2' });
      expect(seen.map(s => s.url)).toEqual(['/nutritiondiary/daily', '/auth/refresh', '/nutritiondiary/daily']);
      // Yêu cầu làm mới không mang access token cũ (đã hết hạn).
      expect(seen[1].authorization).toBeUndefined();
      expect(handler).not.toHaveBeenCalled();
    });

    test('nhiều request cùng nhận 401 chỉ làm mới MỘT lần rồi cùng thử lại', async () => {
      let currentToken = 'old-access';
      mockGetToken.mockImplementation(async () => currentToken);
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockSaveTokens.mockImplementation(async tokens => {
        currentToken = tokens.token;
      });
      let refreshCalls = 0;
      const client = createClient(async config => {
        if (config.url === '/auth/refresh') {
          refreshCalls += 1;
          await new Promise(resolve => setTimeout(resolve, 20));
          return ok(config, tokensEnvelope('new-access', 'refresh-2'));
        }
        return config.headers.Authorization === 'Bearer new-access'
          ? ok(config, { success: true, message: 'ok', data: config.url, errors: null })
          : unauthorized(config);
      });

      const results = await Promise.all([
        client.get('/foods'),
        client.get('/grocery'),
        client.get('/recipes/favorites'),
      ]);

      expect(refreshCalls).toBe(1);
      expect(results.map(r => r.data.data)).toEqual(['/foods', '/grocery', '/recipes/favorites']);
      expect(handler).not.toHaveBeenCalled();
    });

    test('không có refresh token → hết phiên', async () => {
      mockGetToken.mockResolvedValue('jwt-token');
      mockGetRefreshToken.mockResolvedValue(null);
      const client = createClient(unauthorized);

      await expect(client.get('/nutritiondiary/daily')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('refresh token bị từ chối (401) → hết phiên, không thử lại vô hạn', async () => {
      mockGetToken.mockResolvedValue('jwt-token');
      mockGetRefreshToken.mockResolvedValue('stale-refresh');
      const urls: string[] = [];
      const client = createClient(config => {
        urls.push(config.url ?? '');
        return unauthorized(config);
      });

      await expect(client.get('/foods')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

      expect(urls).toEqual(['/foods', '/auth/refresh']);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(mockSaveTokens).not.toHaveBeenCalled();
    });

    test('mất mạng khi làm mới → KHÔNG đăng xuất, báo lỗi mạng', async () => {
      mockGetToken.mockResolvedValue('jwt-token');
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      const client = createClient(config =>
        config.url === '/auth/refresh'
          ? new AxiosError('Network Error', 'ERR_NETWORK', config)
          : unauthorized(config),
      );

      await expect(client.get('/foods')).rejects.toMatchObject({ code: 'NETWORK' });
      expect(handler).not.toHaveBeenCalled();
    });

    test('đã làm mới mà request vẫn 401 → hết phiên (không làm mới lần hai)', async () => {
      let currentToken = 'old-access';
      mockGetToken.mockImplementation(async () => currentToken);
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockSaveTokens.mockImplementation(async tokens => {
        currentToken = tokens.token;
      });
      let refreshCalls = 0;
      const client = createClient(config => {
        if (config.url === '/auth/refresh') {
          refreshCalls += 1;
          return ok(config, tokensEnvelope('new-access', 'refresh-2'));
        }
        return unauthorized(config);
      });

      await expect(client.get('/gamification/pet')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

      expect(refreshCalls).toBe(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  test.each(['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/reset-password'])(
    '401 ở %s (sai thông tin/mã) KHÔNG làm mới và KHÔNG phải hết phiên',
    async path => {
      mockGetToken.mockResolvedValue('jwt-token');
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      const urls: string[] = [];
      const client = createClient(config => {
        urls.push(config.url ?? '');
        return unauthorized(config);
      });

      await expect(client.post(path, {})).rejects.toBeInstanceOf(ApiError);

      expect(urls).toEqual([path]);
      expect(handler).not.toHaveBeenCalled();
    },
  );

  test('401 khi không có token (guest) KHÔNG làm mới và KHÔNG gọi handler', async () => {
    mockGetToken.mockResolvedValue(null);
    const urls: string[] = [];
    const client = createClient(config => {
      urls.push(config.url ?? '');
      return unauthorized(config);
    });

    await expect(client.get('/recipes/favorites')).rejects.toBeInstanceOf(ApiError);

    expect(urls).toEqual(['/recipes/favorites']);
    expect(handler).not.toHaveBeenCalled();
  });

  test('lỗi mạng → ApiError NETWORK, không gọi handler', async () => {
    mockGetToken.mockResolvedValue('jwt-token');
    const client = createClient(config => new AxiosError('Network Error', 'ERR_NETWORK', config));

    await expect(client.get('/foods')).rejects.toMatchObject({ code: 'NETWORK' });
    expect(handler).not.toHaveBeenCalled();
  });
});
