import { Linking } from 'react-native';
import { ENV } from '@/config/env';
import { ENDPOINTS, api, isApiError } from '@/services/api';
import { isProMembership, type MembershipSnapshot } from '@/state/premium/premiumStore';
import type {
  CheckoutSessionResponseDto,
  CreateCheckoutSessionRequestDto,
  PaymentTransactionDto,
  SubscriptionPlanDto,
  SubscriptionStatusDto,
} from '../types/premium.api.types';
import {
  fromPlanDto,
  fromStatusDto,
  fromTransactionDto,
  toApiPaymentMethod,
  toApiPlanId,
} from './premium.mapper';
import type { premiumMockService } from './premiumService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §13). Pro CHỈ được kích hoạt khi server xác nhận
// thanh toán (BR-241/242): FE không tự tính hạn hay tự bật Pro, mà đọc lại GET /subscription/status.

/** Hỏi lại trạng thái gói mỗi 3 giây, tối đa 3 phút (người dùng có thể phải sang trang cổng thanh toán). */
export const CONFIRM_POLL_INTERVAL_MS = 3000;
export const CONFIRM_TIMEOUT_MS = 180000;

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

/** Mở trang thanh toán của cổng; lỗi mở trang không chặn việc chờ xác nhận (có thể đã mở từ trước). */
async function openPaymentPage(paymentUrl: string): Promise<void> {
  try {
    await Linking.openURL(paymentUrl);
  } catch {
    // Bỏ qua: xem chú thích ở trên.
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

async function waitForActivation(before: MembershipSnapshot): Promise<MembershipSnapshot> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  for (;;) {
    const after = await fetchStatus();
    if (isActivatedSince(before, after)) return after;
    if (Date.now() >= deadline) throw new PaymentNotConfirmedError();
    await sleep(CONFIRM_POLL_INTERVAL_MS);
  }
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

  // Tạo phiên thanh toán → (dev) kích hoạt thử, hoặc mở trang cổng thanh toán → chờ server xác nhận.
  async checkout(planId, paymentMethodId) {
    const before = await fetchStatus();
    const request: CreateCheckoutSessionRequestDto = {
      planId: toApiPlanId(planId),
      paymentMethod: toApiPaymentMethod(paymentMethodId),
    };
    const session = await api.post<CheckoutSessionResponseDto, CreateCheckoutSessionRequestDto>(
      ENDPOINTS.subscription.checkout,
      request,
    );

    const activatedByMock = await tryMockActivation(request);
    if (!activatedByMock) await openPaymentPage(session.paymentUrl);

    const membership = await waitForActivation(before);
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
