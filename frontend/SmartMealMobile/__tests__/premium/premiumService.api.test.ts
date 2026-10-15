/**
 * premiumService.api (docs/fetch-api/part1 §13): tạo giao dịch (SePay/PayOS), báo mã QR cho màn hình rồi CHỜ SERVER
 * XÁC NHẬN qua check-status (server tự hỏi cổng thanh toán) trước khi coi là Pro (BR-241/242). Không còn đường tắt
 * kích hoạt thử. `api`, `Linking` và env được mock; thời gian chờ dùng fake timers.
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

const SEPAY_SESSION = {
  sessionId: 'SM7K2P9QXA',
  orderCode: 176000000000777,
  paymentUrl: 'https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=79000&des=SM7K2P9QXA',
  qrCodeUrl: 'https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=79000&des=SM7K2P9QXA',
  amountVnd: 79000,
  message: 'ok',
  bankCode: 'MBBank',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN A',
  transferContent: 'SM7K2P9QXA',
  expiresAt: null as string | null,
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

/** Tạo giao dịch SePay rồi trả lần lượt các kết quả check-status; gói đọc lại là Pro sau khi đã trả tiền. */
function routeSePay(
  apiMock: { get: jest.Mock; post: jest.Mock },
  checks: { status: string; isPaid: boolean }[],
  session: typeof SEPAY_SESSION = SEPAY_SESSION,
) {
  const results = [...checks];
  apiMock.post.mockImplementation(async (url: string) => {
    if (url === '/subscription/create-checkout-session') return session;
    throw new Error(`POST không mong đợi: ${url}`);
  });
  apiMock.get.mockImplementation(async (url: string) => {
    if (url === '/subscription/status') return PRO_NOV;
    if (url === `/subscription/check-status/${session.orderCode}`) {
      const next = results.length > 1 ? results.shift()! : results[0];
      return { orderCode: session.orderCode, planId: 'PRO_MONTHLY', amountVnd: 79000, paidAt: null, ...next };
    }
    throw new Error(`GET không mong đợi: ${url}`);
  });
}

afterEach(() => {
  jest.useRealTimers();
});

describe('checkout SePay (chuyển khoản VietQR vào tài khoản ngân hàng)', () => {
  test('báo QR + thông tin chuyển khoản cho màn hình, hỏi check-status tới khi server xác nhận; không kích hoạt thử', async () => {
    jest.useFakeTimers();
    const { service, apiMock, linking, CONFIRM_POLL_INTERVAL_MS } = loadService('development');
    routeSePay(apiMock, [
      { status: 'Pending', isPaid: false },
      { status: 'Pending', isPaid: false },
      { status: 'Paid', isPaid: true },
    ]);
    const onSession = jest.fn();

    const pending = service.checkout?.('monthly', 'sepay', { onSession });
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS * 3);
    const result = await pending;

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).toHaveBeenCalledWith('/subscription/create-checkout-session', {
      planId: 'PRO_MONTHLY',
      paymentMethod: 'SEPAY',
    });
    expect(linking.openURL).not.toHaveBeenCalled();
    expect(onSession).toHaveBeenCalledWith({
      sessionId: 'SM7K2P9QXA',
      orderCode: SEPAY_SESSION.orderCode,
      paymentUrl: SEPAY_SESSION.paymentUrl,
      qrCodeUrl: SEPAY_SESSION.qrCodeUrl,
      amountVnd: 79000,
      bankTransfer: {
        bankCode: 'MBBank',
        accountNumber: '0123456789',
        accountName: 'NGUYEN VAN A',
        transferContent: 'SM7K2P9QXA',
        expiresAtIso: null,
      },
    });
    expect(result).toMatchObject({
      transactionId: 'SM7K2P9QXA',
      amountVnd: 79000,
      planId: 'monthly',
      paymentMethodId: 'sepay',
      expiresAtIso: '2026-11-02',
      membership: { status: 'premium', planId: 'monthly', expiresAtIso: '2026-11-02' },
    });
  });

  test('gói năm gửi PRO_YEARLY', async () => {
    const { service, apiMock } = loadService('production');
    routeSePay(apiMock, [{ status: 'Paid', isPaid: true }]);

    await service.checkout?.('yearly', 'sepay');

    expect(apiMock.post).toHaveBeenCalledWith('/subscription/create-checkout-session', {
      planId: 'PRO_YEARLY',
      paymentMethod: 'SEPAY',
    });
  });

  test('tạo giao dịch lỗi (vd. SePay chưa cấu hình) → ném lỗi của BE, không chờ gì', async () => {
    const { service, apiMock, ApiError } = loadService('production');
    const error = new ApiError('Thanh toán chuyển khoản (SePay) chưa được cấu hình trên máy chủ.', 'SERVER', 503);
    apiMock.post.mockRejectedValue(error);

    await expect(service.checkout?.('monthly', 'sepay')).rejects.toBe(error);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  test('chờ tới hạn của mã QR (lâu hơn 10 phút) mà chưa nhận được tiền → PaymentNotConfirmedError, KHÔNG coi là Pro', async () => {
    jest.useFakeTimers();
    const { service, apiMock, PaymentNotConfirmedError, CONFIRM_TIMEOUT_MS, CONFIRM_POLL_INTERVAL_MS } =
      loadService('production');
    const expiresInMs = CONFIRM_TIMEOUT_MS + 5 * 60000;
    routeSePay(apiMock, [{ status: 'Pending', isPaid: false }], {
      ...SEPAY_SESSION,
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    });

    let settled = false;
    const outcome = service.checkout?.('monthly', 'sepay').catch((error: unknown) => error).finally(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(CONFIRM_TIMEOUT_MS + CONFIRM_POLL_INTERVAL_MS);
    expect(settled).toBe(false);                                  // 10 phút chưa đủ: mã còn hạn thì vẫn chờ
    await jest.advanceTimersByTimeAsync(expiresInMs - CONFIRM_TIMEOUT_MS);

    const error = await outcome;
    expect(error).toBeInstanceOf(PaymentNotConfirmedError);
    expect((error as Error).message).toContain('Chưa nhận được xác nhận thanh toán');
    expect(apiMock.get).not.toHaveBeenCalledWith('/subscription/status');
  });
});

describe('checkout PayOS (cổng thật: hiện QR, server hỏi PayOS)', () => {
  const PAYOS_SESSION = {
    sessionId: 'PAYOS_176000000000001',
    orderCode: 176000000000001,
    paymentUrl: 'https://pay.payos.vn/web/abc',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=VIETQR',
    qrCode: 'VIETQR',
    amountVnd: 79000,
    message: 'ok',
  };

  function routePayOS(apiMock: { get: jest.Mock; post: jest.Mock }, checks: { status: string; isPaid: boolean }[]) {
    const results = [...checks];
    apiMock.post.mockImplementation(async (url: string) => {
      if (url === '/subscription/create-checkout-session') return PAYOS_SESSION;
      throw new Error(`POST không mong đợi: ${url}`);
    });
    apiMock.get.mockImplementation(async (url: string) => {
      if (url === '/subscription/status') return apiMock.get.mock.calls.length > 1 ? PRO_NOV : status(FREE);
      if (url === `/subscription/check-status/${PAYOS_SESSION.orderCode}`) {
        const next = results.length > 1 ? results.shift()! : results[0];
        return { orderCode: PAYOS_SESSION.orderCode, planId: 'PRO_MONTHLY', amountVnd: 79000, paidAt: null, ...next };
      }
      throw new Error(`GET không mong đợi: ${url}`);
    });
  }

  test('báo phiên (QR, mã đơn) cho màn hình rồi hỏi check-status tới khi server xác nhận; không kích hoạt thử', async () => {
    jest.useFakeTimers();
    const { service, apiMock, linking, CONFIRM_POLL_INTERVAL_MS } = loadService('development');
    routePayOS(apiMock, [
      { status: 'Pending', isPaid: false },
      { status: 'Pending', isPaid: false },
      { status: 'Paid', isPaid: true },
    ]);
    const onSession = jest.fn();

    const pending = service.checkout?.('monthly', 'payos', { onSession });
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS * 3);
    const result = await pending;

    expect(apiMock.post).toHaveBeenCalledWith('/subscription/create-checkout-session', {
      planId: 'PRO_MONTHLY',
      paymentMethod: 'PAYOS',
    });
    expect(apiMock.post).not.toHaveBeenCalledWith('/subscription/activate-mock', expect.anything());
    expect(linking.openURL).not.toHaveBeenCalled();
    expect(onSession).toHaveBeenCalledWith({
      sessionId: PAYOS_SESSION.sessionId,
      orderCode: PAYOS_SESSION.orderCode,
      paymentUrl: PAYOS_SESSION.paymentUrl,
      qrCodeUrl: PAYOS_SESSION.qrCodeUrl,
      amountVnd: 79000,
    });
    expect(result).toMatchObject({ paymentMethodId: 'payos', membership: { status: 'premium', expiresAtIso: '2026-11-02' } });
  });

  test('PayOS báo đơn bị hủy/hết hạn → PaymentFailedError', async () => {
    const { service, apiMock, PaymentFailedError } = loadService('production');
    routePayOS(apiMock, [{ status: 'Failed', isPaid: false }]);

    await expect(service.checkout?.('monthly', 'payos')).rejects.toBeInstanceOf(PaymentFailedError);
  });

  test('rời màn hình (abort) → dừng hỏi, PaymentCancelledError', async () => {
    jest.useFakeTimers();
    const { service, apiMock, PaymentCancelledError, CONFIRM_POLL_INTERVAL_MS } = loadService('production');
    routePayOS(apiMock, [{ status: 'Pending', isPaid: false }]);
    const controller = new AbortController();

    const outcome = service.checkout?.('monthly', 'payos', { signal: controller.signal }).catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS);
    controller.abort();
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS);

    expect(await outcome).toBeInstanceOf(PaymentCancelledError);
    const checks = apiMock.get.mock.calls.filter(([url]) => String(url).includes('check-status')).length;
    await jest.advanceTimersByTimeAsync(CONFIRM_POLL_INTERVAL_MS * 5);
    expect(apiMock.get.mock.calls.filter(([url]) => String(url).includes('check-status')).length).toBe(checks);
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
