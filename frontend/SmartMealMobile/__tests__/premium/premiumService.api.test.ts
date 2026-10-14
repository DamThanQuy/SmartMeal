/**
 * premiumService.api (docs/fetch-api/part1 §13): tạo phiên thanh toán, kích hoạt thử ở môi trường
 * phát triển, mở cổng thanh toán và CHỜ SERVER XÁC NHẬN (đọc lại trạng thái gói) trước khi coi là
 * Pro (BR-241/242). `api`, `Linking` và env được mock; thời gian chờ dùng fake timers.
 */
import type { MembershipSnapshot } from '@/state/premium/premiumStore';

const FREE: MembershipSnapshot = { status: 'free', planId: null, expiresAtIso: null };

function status(snapshot: MembershipSnapshot) {
  return {
    status: snapshot.status === 'free' ? 'Free' : snapshot.status === 'premium' ? 'Premium' : 'Expired',
    isPro: snapshot.status === 'premium',
    planId: snapshot.planId === 'monthly' ? 'PRO_MONTHLY' : snapshot.planId === 'yearly' ? 'PRO_YEARLY' : null,
    // Giữa trưa UTC để ngày theo giờ máy không lệch ở bất kỳ múi giờ nào.
    proExpiresAt: snapshot.expiresAtIso ? `${snapshot.expiresAtIso}T12:00:00Z` : null,
  };
}

const PRO_NOV = status({ status: 'premium', planId: 'monthly', expiresAtIso: '2026-11-02' });
const PRO_DEC = status({ status: 'premium', planId: 'monthly', expiresAtIso: '2026-12-02' });

const SESSION = {
  sessionId: 'SES_abc',
  paymentUrl: 'https://sandbox.vnpayment.vn/pay?vnp_Session=SES_abc',
  qrCodeUrl: null,
  amountVnd: 79000,
  message: 'ok',
};

function loadService(appEnv: 'development' | 'production' = 'development') {
  const apiMock = { get: jest.fn(), post: jest.fn() };
  const linking = { openURL: jest.fn().mockResolvedValue(undefined) };

  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { appEnv, useMockApi: false } }));
  jest.doMock('react-native', () => ({ Linking: linking }));
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
  }));

  const module =
    require('@/features/premium/services/premiumService.api') as typeof import('@/features/premium/services/premiumService.api');
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return { ...module, service: module.premiumApiService, apiMock, linking, ApiError };
}

/** Gọi theo URL — thứ tự get/post khác nhau giữa các kịch bản nên không dùng mockResolvedValueOnce theo lượt. */
function route(
  apiMock: { get: jest.Mock; post: jest.Mock },
  handlers: { status: unknown[]; createSession?: unknown; activateMock?: () => unknown },
) {
  const statuses = [...handlers.status];
  apiMock.get.mockImplementation(async (url: string) => {
    if (url === '/subscription/status') {
      return statuses.length > 1 ? statuses.shift() : statuses[0];
    }
    throw new Error(`GET không mong đợi: ${url}`);
  });
  apiMock.post.mockImplementation(async (url: string) => {
    if (url === '/subscription/create-checkout-session') return handlers.createSession ?? SESSION;
    if (url === '/subscription/activate-mock') return (handlers.activateMock ?? (() => true))();
    throw new Error(`POST không mong đợi: ${url}`);
  });
}

afterEach(() => {
  jest.useRealTimers();
});

describe('checkout (môi trường phát triển có cổng giả lập)', () => {
  test('tạo phiên → kích hoạt thử → đọc lại trạng thái do server xác nhận (không tự tính hạn)', async () => {
    const { service, apiMock, linking } = loadService('development');
    route(apiMock, { status: [status(FREE), PRO_NOV] });

    const result = await service.checkout?.('monthly', 'vnpay');

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/subscription/create-checkout-session', {
      planId: 'PRO_MONTHLY',
      paymentMethod: 'VNPAY',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/subscription/activate-mock', {
      planId: 'PRO_MONTHLY',
      paymentMethod: 'VNPAY',
    });
    // Đã kích hoạt thử thì không cần mở trang cổng thanh toán.
    expect(linking.openURL).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      transactionId: 'SES_abc',
      amountVnd: 79000,
      planId: 'monthly',
      paymentMethodId: 'vnpay',
      expiresAtIso: '2026-11-02',
      membership: { status: 'premium', planId: 'monthly', expiresAtIso: '2026-11-02' },
    });
  });

  test('thẻ quốc tế gửi STRIPE; gói năm gửi PRO_YEARLY', async () => {
    const { service, apiMock } = loadService('development');
    route(apiMock, { status: [status(FREE), PRO_NOV] });

    await service.checkout?.('yearly', 'card');

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/subscription/create-checkout-session', {
      planId: 'PRO_YEARLY',
      paymentMethod: 'STRIPE',
    });
  });

  test('tạo phiên lỗi → ném lỗi của BE, không kích hoạt gì', async () => {
    const { service, apiMock, ApiError } = loadService('development');
    const error = new ApiError('planId không hợp lệ.', 'BUSINESS', 400);
    apiMock.get.mockResolvedValue(status(FREE));
    apiMock.post.mockRejectedValue(error);

    await expect(service.checkout?.('monthly', 'vnpay')).rejects.toBe(error);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
  });

  test('gia hạn khi đang Pro: chỉ coi là xong khi hạn đã dời ra sau', async () => {
    jest.useFakeTimers();
    const { service, apiMock, CONFIRM_POLL_INTERVAL_MS } = loadService('development');
    // Trước: Pro đến 02/11; hai lần đầu vẫn 02/11 (chưa xử lý xong); lần thứ ba đã dời sang 02/12.
    route(apiMock, { status: [PRO_NOV, PRO_NOV, PRO_NOV, PRO_DEC] });

    const pending = service.checkout?.('monthly', 'vnpay');
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS * 3);
    const result = await pending;

    expect(result?.expiresAtIso).toBe('2026-12-02');
    expect(result?.membership.status).toBe('premium');
  });
});

describe('checkout (không có cổng giả lập: production hoặc BE trả 404)', () => {
  test('BE trả 404 cho activate-mock → mở trang cổng thanh toán rồi hỏi lại tới khi server xác nhận', async () => {
    jest.useFakeTimers();
    const { service, apiMock, linking, ApiError, CONFIRM_POLL_INTERVAL_MS } = loadService('development');
    route(apiMock, {
      status: [status(FREE), status(FREE), status(FREE), PRO_NOV],
      activateMock: () => {
        throw new ApiError('Không tìm thấy tài nguyên yêu cầu.', 'NOT_FOUND', 404);
      },
    });

    const pending = service.checkout?.('monthly', 'momo');
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS * 3);
    const result = await pending;

    expect(linking.openURL).toHaveBeenCalledWith(SESSION.paymentUrl);
    expect(result?.membership).toMatchObject({ status: 'premium', expiresAtIso: '2026-11-02' });
    expect(result?.paymentMethodId).toBe('momo');
  });

  test('production không bao giờ gọi kích hoạt thử', async () => {
    const { service, apiMock, linking } = loadService('production');
    route(apiMock, { status: [status(FREE), PRO_NOV] });

    await service.checkout?.('monthly', 'vnpay');

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).not.toHaveBeenCalledWith('/subscription/activate-mock', expect.anything());
    expect(linking.openURL).toHaveBeenCalledTimes(1);
  });

  test('mở được trang thanh toán hay không đều không chặn việc chờ xác nhận', async () => {
    const { service, apiMock, linking } = loadService('production');
    linking.openURL.mockRejectedValue(new Error('không có trình duyệt'));
    route(apiMock, { status: [status(FREE), PRO_NOV] });

    await expect(service.checkout?.('monthly', 'vnpay')).resolves.toMatchObject({
      membership: { status: 'premium' },
    });
  });

  test('chờ quá 3 phút mà server chưa xác nhận → PaymentNotConfirmedError, KHÔNG coi là Pro', async () => {
    jest.useFakeTimers();
    const { service, apiMock, PaymentNotConfirmedError, CONFIRM_TIMEOUT_MS, CONFIRM_POLL_INTERVAL_MS } =
      loadService('production');
    route(apiMock, { status: [status(FREE)] });

    const outcome = service.checkout?.('monthly', 'vnpay').catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(CONFIRM_TIMEOUT_MS + CONFIRM_POLL_INTERVAL_MS);

    const error = await outcome;
    expect(error).toBeInstanceOf(PaymentNotConfirmedError);
    expect((error as Error).message).toContain('Chưa nhận được xác nhận thanh toán');
  });
});

describe('trạng thái, giao dịch, bảng giá, hủy gia hạn', () => {
  test('getStatus: GET /subscription/status', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(PRO_NOV);

    await expect(service.getStatus?.()).resolves.toEqual({
      status: 'premium',
      planId: 'monthly',
      expiresAtIso: '2026-11-02',
    });
    expect(apiMock.get).toHaveBeenCalledWith('/subscription/status');
  });

  test('getTransactions: GET /subscription/transactions, bỏ giao dịch gói lạ', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue([
      {
        id: 'a',
        sessionId: 'S1',
        planId: 'PRO_MONTHLY',
        amountVnd: 79000,
        paymentMethod: 'MOMO',
        status: 'Paid',
        createdAt: '2026-10-02T03:00:00Z',
        paidAt: '2026-10-02T03:01:00Z',
      },
      {
        id: 'b',
        sessionId: 'S2',
        planId: 'PRO_LIFETIME',
        amountVnd: 1,
        paymentMethod: 'MOMO',
        status: 'Paid',
        createdAt: '2026-10-01T03:00:00Z',
        paidAt: null,
      },
    ]);

    const list = await service.getTransactions?.();

    expect(apiMock.get).toHaveBeenCalledWith('/subscription/transactions');
    expect(list?.map(item => [item.id, item.status, item.paymentMethodId])).toEqual([
      ['a', 'success', 'momo'],
    ]);
  });

  test('getPlans: GET /subscription/plans → giá do BE', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue([
      { id: 'PRO_MONTHLY', name: 'x', priceVnd: 79000, billingCycle: 'Monthly', features: [], isPopular: false },
      { id: 'PRO_YEARLY', name: 'y', priceVnd: 699000, billingCycle: 'Yearly', features: [], isPopular: true },
    ]);

    const plans = await service.getPlans?.();

    expect(apiMock.get).toHaveBeenCalledWith('/subscription/plans');
    expect(plans?.map(plan => [plan.id, plan.priceLabel])).toEqual([
      ['monthly', '79.000đ'],
      ['yearly', '699.000đ'],
    ]);
  });

  test('cancelRenewal: POST /subscription/cancel → "đã hủy" nhưng vẫn còn hạn', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ ...PRO_NOV, status: 'Cancelled' });

    await expect(service.cancelRenewal?.()).resolves.toEqual({
      status: 'cancelled',
      planId: 'monthly',
      expiresAtIso: '2026-11-02',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/subscription/cancel');
  });

  test('cancelRenewal khi chưa có Pro → ném lỗi của BE', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Bạn chưa có gói Pro đang hoạt động để hủy.', 'BUSINESS', 400);
    apiMock.post.mockRejectedValue(error);

    await expect(service.cancelRenewal?.()).rejects.toBe(error);
  });
});
