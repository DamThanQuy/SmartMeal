import { ENV } from '@/config/env';
import { ENDPOINTS, api, isApiError } from '@/services/api';
import { isProMembership, type MembershipSnapshot } from '@/state/premium/premiumStore';
import type {
  CheckoutSessionResponseDto,
  CreateCheckoutSessionRequestDto,
  PaymentTransactionDto,
  PaymentTransactionStatusDto,
  SubscriptionPlanDto,
  SubscriptionStatusDto,
} from '../types/premium.api.types';
import type { CheckoutSession } from '../types/premium.types';
import {
  fromPlanDto,
  fromStatusDto,
  fromTransactionDto,
  toApiPaymentMethod,
  toApiPlanId,
} from './premium.mapper';
import { openPaymentPage } from './paymentPage';
import type { premiumMockService } from './premiumService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §13). Pro CHỈ được kích hoạt khi server xác nhận
// thanh toán (BR-241/242): FE không tự tính hạn hay tự bật Pro, mà đọc lại GET /subscription/status.

/** Hỏi lại trạng thái gói mỗi 3 giây, tối đa 3 phút (người dùng có thể phải sang trang cổng thanh toán). */
export const CONFIRM_POLL_INTERVAL_MS = 3000;
export const CONFIRM_TIMEOUT_MS = 180000;
/** PayOS: người dùng phải mở app ngân hàng quét QR và chuyển khoản nên chờ lâu hơn (10 phút). */
export const PAYOS_CONFIRM_TIMEOUT_MS = 600000;

/** Đã tạo phiên thanh toán nhưng server chưa xác nhận trong thời gian chờ — gói Pro CHƯA được kích hoạt. */
export class PaymentNotConfirmedError extends Error {
  constructor() {
    super(
      'Chưa nhận được xác nhận thanh toán. Nếu bạn đã thanh toán, gói Pro sẽ tự kích hoạt khi cổng thanh toán xác nhận — hãy kiểm tra lại ở "Gói của tôi".',
    );
    this.name = 'PaymentNotConfirmedError';
    Object.setPrototypeOf(this, PaymentNotConfirmedError.prototype);
  }
}

/** PayOS báo đơn đã bị hủy hoặc hết hạn — không có tiền nào bị trừ, có thể tạo đơn mới. */
export class PaymentFailedError extends Error {
  constructor() {
    super('Giao dịch PayOS đã bị hủy hoặc hết hạn. Bạn chưa bị trừ tiền — hãy tạo giao dịch mới.');
    this.name = 'PaymentFailedError';
    Object.setPrototypeOf(this, PaymentFailedError.prototype);
  }
}

/** Người dùng rời màn chờ thanh toán: ngừng hỏi trạng thái (giao dịch vẫn có thể được xác nhận sau ở server). */
export class PaymentCancelledError extends Error {
  constructor() {
    super('Đã dừng chờ xác nhận thanh toán.');
    this.name = 'PaymentCancelledError';
    Object.setPrototypeOf(this, PaymentCancelledError.prototype);
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new PaymentCancelledError();
}

async function fetchStatus(): Promise<MembershipSnapshot> {
  return fromStatusDto(await api.get<SubscriptionStatusDto>(ENDPOINTS.subscription.status));
}

/**
 * Môi trường phát triển: POST /subscription/activate-mock mô phỏng việc cổng thanh toán xác nhận.
 * Backend chỉ cho phép ở Development (hoặc khi bật cấu hình); nơi khác trả 404 → coi là "không có
 * cổng giả lập", người dùng phải thanh toán thật. Trả true khi đã kích hoạt thử.
 */
async function tryMockActivation(request: CreateCheckoutSessionRequestDto): Promise<boolean> {
  if (ENV.appEnv === 'production') return false;
  try {
    await api.post<boolean, CreateCheckoutSessionRequestDto>(
      ENDPOINTS.subscription.activateMock,
      request,
    );
    return true;
  } catch (error) {
    if (isApiError(error) && error.code === 'NOT_FOUND') return false;
    throw error;
  }
}

/** Gói vừa được kích hoạt/gia hạn: đang Pro và (trước đó không Pro, hoặc hạn đã đổi). */
function isActivatedSince(before: MembershipSnapshot, after: MembershipSnapshot): boolean {
  if (!isProMembership(after.status)) return false;
  return !isProMembership(before.status) || after.expiresAtIso !== before.expiresAtIso;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForActivation(
  before: MembershipSnapshot,
  signal?: AbortSignal,
): Promise<MembershipSnapshot> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  for (;;) {
    throwIfAborted(signal);
    const after = await fetchStatus();
    if (isActivatedSince(before, after)) return after;
    if (Date.now() >= deadline) throw new PaymentNotConfirmedError();
    await sleep(CONFIRM_POLL_INTERVAL_MS);
  }
}

/**
 * PayOS: hỏi GET /subscription/check-status/{orderCode} — máy chủ tự hỏi PayOS (server-to-server) và kích hoạt Pro khi
 * đã nhận đủ tiền, nên vẫn chạy được khi webhook không tới được máy chủ. Đã trả tiền → đọc lại gói do server xác nhận.
 */
async function waitForPayOS(orderCode: number, signal?: AbortSignal): Promise<MembershipSnapshot> {
  const deadline = Date.now() + PAYOS_CONFIRM_TIMEOUT_MS;
  for (;;) {
    throwIfAborted(signal);
    const result = await api.get<PaymentTransactionStatusDto>(ENDPOINTS.subscription.checkStatus(orderCode));
    if (result.isPaid) return fetchStatus();
    if (result.status.toLowerCase() === 'failed') throw new PaymentFailedError();
    if (Date.now() >= deadline) throw new PaymentNotConfirmedError();
    await sleep(CONFIRM_POLL_INTERVAL_MS);
  }
}

function toCheckoutSession(dto: CheckoutSessionResponseDto): CheckoutSession {
  return {
    sessionId: dto.sessionId,
    orderCode: dto.orderCode ?? null,
    paymentUrl: dto.paymentUrl,
    qrCodeUrl: dto.qrCodeUrl,
    amountVnd: dto.amountVnd,
  };
}

export const premiumApiService: Partial<typeof premiumMockService> = {
  // GET /subscription/plans — giá và chu kỳ do BE quyết định.
  async getPlans() {
    const plans = await api.get<SubscriptionPlanDto[]>(ENDPOINTS.subscription.plans);
    return plans.flatMap(plan => fromPlanDto(plan) ?? []);
  },

  // GET /subscription/status — Free | Premium | Expired | Cancelled (+ gói, hạn).
  getStatus: fetchStatus,

  // GET /subscription/transactions — mới → cũ.
  async getTransactions() {
    const list = await api.get<PaymentTransactionDto[]>(ENDPOINTS.subscription.transactions);
    return list.flatMap(transaction => fromTransactionDto(transaction) ?? []);
  },

  // POST /subscription/cancel — hủy gia hạn, vẫn dùng Pro tới hết hạn.
  async cancelRenewal() {
    return fromStatusDto(await api.post<SubscriptionStatusDto>(ENDPOINTS.subscription.cancel));
  },

  // Tạo phiên thanh toán → chờ server xác nhận. PayOS: màn hình hiện QR (onSession) và hỏi check-status; cổng khác:
  // (dev) kích hoạt thử, hoặc mở trang cổng thanh toán rồi đọc lại trạng thái gói.
  async checkout(planId, paymentMethodId, options) {
    const before = await fetchStatus();
    const request: CreateCheckoutSessionRequestDto = {
      planId: toApiPlanId(planId),
      paymentMethod: toApiPaymentMethod(paymentMethodId),
    };
    const session = await api.post<CheckoutSessionResponseDto, CreateCheckoutSessionRequestDto>(
      ENDPOINTS.subscription.checkout,
      request,
    );
    options?.onSession?.(toCheckoutSession(session));

    let membership: MembershipSnapshot;
    if (paymentMethodId === 'payos' && session.orderCode) {
      // PayOS là cổng thật: không kích hoạt thử; người dùng quét QR hoặc tự mở trang PayOS từ màn hình chờ.
      membership = await waitForPayOS(session.orderCode, options?.signal);
    } else {
      const activatedByMock = await tryMockActivation(request);
      if (!activatedByMock) await openPaymentPage(session.paymentUrl);
      membership = await waitForActivation(before, options?.signal);
    }
    return {
      transactionId: session.sessionId,
      amountVnd: session.amountVnd,
      planId,
      paymentMethodId,
      expiresAtIso: membership.expiresAtIso,
      membership,
    };
  },
};
