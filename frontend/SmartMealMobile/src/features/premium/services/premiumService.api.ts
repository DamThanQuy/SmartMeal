import { ENDPOINTS, api } from '@/services/api';
import type { MembershipSnapshot } from '@/state/premium/premiumStore';
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
import type { premiumMockService } from './premiumService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §13). Pro CHỈ được kích hoạt khi server xác nhận
// thanh toán (BR-241/242): FE không tự tính hạn hay tự bật Pro, mà hỏi GET /subscription/check-status
// (server tự hỏi SePay/PayOS) rồi đọc lại GET /subscription/status.

/** Hỏi lại trạng thái giao dịch mỗi 3 giây. */
export const CONFIRM_POLL_INTERVAL_MS = 3000;
/** Người dùng phải mở app ngân hàng quét QR và chuyển khoản nên chờ tối đa 10 phút (hoặc tới hạn của mã nếu lâu hơn). */
export const CONFIRM_TIMEOUT_MS = 600000;

/** Đã tạo giao dịch nhưng server chưa xác nhận trong thời gian chờ — gói Pro CHƯA được kích hoạt. */
export class PaymentNotConfirmedError extends Error {
  constructor() {
    super(
      'Chưa nhận được xác nhận thanh toán. Nếu bạn đã chuyển khoản, gói Pro sẽ tự kích hoạt khi hệ thống nhận được tiền — hãy kiểm tra lại ở "Gói của tôi".',
    );
    this.name = 'PaymentNotConfirmedError';
    Object.setPrototypeOf(this, PaymentNotConfirmedError.prototype);
  }
}

/** Cổng thanh toán báo giao dịch đã bị hủy hoặc hết hạn — không có tiền nào bị trừ, có thể tạo giao dịch mới. */
export class PaymentFailedError extends Error {
  constructor() {
    super('Giao dịch đã bị hủy hoặc hết hạn. Bạn chưa bị trừ tiền — hãy tạo giao dịch mới.');
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hỏi GET /subscription/check-status/{orderCode} — máy chủ tự hỏi SePay/PayOS (server-to-server) và kích hoạt Pro khi đã
 * nhận đủ tiền, nên vẫn chạy được khi webhook không tới được máy chủ. Đã trả tiền → đọc lại gói do server xác nhận.
 */
async function waitForConfirmation(orderCode: number, deadline: number, signal?: AbortSignal): Promise<MembershipSnapshot> {
  for (;;) {
    throwIfAborted(signal);
    const result = await api.get<PaymentTransactionStatusDto>(ENDPOINTS.subscription.checkStatus(orderCode));
    if (result.isPaid) return fetchStatus();
    if (result.status.toLowerCase() === 'failed') throw new PaymentFailedError();
    if (Date.now() >= deadline) throw new PaymentNotConfirmedError();
    await sleep(CONFIRM_POLL_INTERVAL_MS);
  }
}

/** Chờ tới hạn của mã QR (SePay) nếu lâu hơn thời gian chờ mặc định. */
function confirmationDeadline(dto: CheckoutSessionResponseDto): number {
  const byDefault = Date.now() + CONFIRM_TIMEOUT_MS;
  const expiresAt = dto.expiresAt ? Date.parse(dto.expiresAt) : NaN;
  return Number.isFinite(expiresAt) ? Math.max(byDefault, expiresAt) : byDefault;
}

function toCheckoutSession(dto: CheckoutSessionResponseDto): CheckoutSession {
  const session: CheckoutSession = {
    sessionId: dto.sessionId,
    orderCode: dto.orderCode ?? null,
    paymentUrl: dto.paymentUrl,
    qrCodeUrl: dto.qrCodeUrl,
    amountVnd: dto.amountVnd,
  };
  if (dto.bankCode && dto.accountNumber && dto.transferContent) {
    session.bankTransfer = {
      bankCode: dto.bankCode,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName ?? null,
      transferContent: dto.transferContent,
      expiresAtIso: dto.expiresAt ?? null,
    };
  }
  return session;
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

  // Tạo giao dịch → màn hình hiện mã VietQR (onSession) → hỏi check-status tới khi server xác nhận đã nhận tiền. Không có
  // đường tắt kích hoạt thử: Pro chỉ bật khi SePay/PayOS báo tiền đã vào.
  async checkout(planId, paymentMethodId, options) {
    const request: CreateCheckoutSessionRequestDto = {
      planId: toApiPlanId(planId),
      paymentMethod: toApiPaymentMethod(paymentMethodId),
    };
    const session = await api.post<CheckoutSessionResponseDto, CreateCheckoutSessionRequestDto>(
      ENDPOINTS.subscription.checkout,
      request,
    );
    if (!session.orderCode) throw new PaymentNotConfirmedError();
    options?.onSession?.(toCheckoutSession(session));

    const membership = await waitForConfirmation(session.orderCode, confirmationDeadline(session), options?.signal);
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
