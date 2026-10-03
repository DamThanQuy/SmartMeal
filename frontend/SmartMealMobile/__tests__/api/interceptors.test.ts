/**
 * Interceptor (docs/fetch-api/part1 §4.3): gắn Bearer token; chỉ coi là hết phiên khi request CÓ
 * token nhận 401 và không phải endpoint đăng nhập/đăng ký (sai mật khẩu cũng là 401).
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

jest.mock('@/services/storage/secureStorage', () => ({
  tokenStorage: { get: () => mockGetToken() },
}));

function createClient(respond: (config: InternalAxiosRequestConfig) => AxiosResponse | AxiosError) {
  const adapter: AxiosAdapter = config => {
    const result = respond(config);
    return result instanceof AxiosError ? Promise.reject(result) : Promise.resolve(result);
  };
  const client = createAxiosInstance({ baseURL: 'http://test/api', adapter });
  installInterceptors(client);
  return client;
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const response = { status: 401, data: '', statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('installInterceptors', () => {
  const handler = jest.fn();

  beforeEach(() => {
    handler.mockReset();
    mockGetToken.mockReset();
    setUnauthorizedHandler(handler);
  });

  test('gắn Authorization: Bearer <token> khi có token', async () => {
    mockGetToken.mockResolvedValue('jwt-token');
    let seenAuthorization: unknown;
    const client = createClient(config => {
      seenAuthorization = config.headers.Authorization;
      return { status: 200, data: {}, statusText: 'OK', headers: {}, config };
    });

    await client.get('/auth/me');

    expect(seenAuthorization).toBe('Bearer jwt-token');
  });

  test('không gắn Authorization khi chưa có token', async () => {
    mockGetToken.mockResolvedValue(null);
    let seenAuthorization: unknown = 'chưa đặt';
    const client = createClient(config => {
      seenAuthorization = config.headers.Authorization;
      return { status: 200, data: {}, statusText: 'OK', headers: {}, config };
    });

    await client.get('/recipes');

    expect(seenAuthorization).toBeUndefined();
  });

  test('401 trên request có token → gọi handler hết phiên và ném ApiError UNAUTHORIZED', async () => {
    mockGetToken.mockResolvedValue('jwt-token');
    const client = createClient(unauthorized);

    await expect(client.get('/nutritiondiary/daily')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('401 ở /auth/login (sai mật khẩu) KHÔNG phải hết phiên', async () => {
    mockGetToken.mockResolvedValue('jwt-token');
    const client = createClient(unauthorized);

    await expect(client.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  test('401 khi không có token (guest) KHÔNG gọi handler', async () => {
    mockGetToken.mockResolvedValue(null);
    const client = createClient(unauthorized);

    await expect(client.get('/recipes/favorites')).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  test('lỗi mạng → ApiError NETWORK, không gọi handler', async () => {
    mockGetToken.mockResolvedValue('jwt-token');
    const client = createClient(
      config => new AxiosError('Network Error', 'ERR_NETWORK', config),
    );

    await expect(client.get('/foods')).rejects.toMatchObject({ code: 'NETWORK' });
    expect(handler).not.toHaveBeenCalled();
  });
});
