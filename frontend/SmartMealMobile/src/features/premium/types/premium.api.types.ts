// DTO của backend cho /subscription/* (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper
// import file này, hook/screen chỉ biết type FE trong premium.types.ts.

export type ApiPlanId = 'PRO_MONTHLY' | 'PRO_YEARLY';
export type ApiPaymentMethod = 'VNPAY' | 'MOMO' | 'STRIPE';

/** GET /subscription/plans — nguồn duy nhất cho giá và chu kỳ. */
export interface SubscriptionPlanDto {
  id: string;
  name: string;
  priceVnd: number;
  /** Monthly | Yearly. */
  billingCycle: string;
  features: string[];
  isPopular: boolean;
}

/** POST /subscription/create-checkout-session (và /activate-mock ở môi trường phát triển). */
export interface CreateCheckoutSessionRequestDto {
  planId: ApiPlanId;
  paymentMethod: ApiPaymentMethod;
}

export interface CheckoutSessionResponseDto {
  sessionId: string;
  paymentUrl: string;
  qrCodeUrl: string | null;
  amountVnd: number;
  message: string;
}

/** GET /subscription/status và POST /subscription/cancel. */
export interface SubscriptionStatusDto {
  /** Free | Premium | Expired | Cancelled (Cancelled = đã hủy gia hạn, vẫn dùng Pro tới hết hạn). */
  status: string;
  /** Quyền Pro còn hiệu lực (Premium hoặc Cancelled-nhưng-chưa-hết-hạn). */
  isPro: boolean;
  planId: string | null;
  /** ISO 8601 UTC; null khi chưa từng có gói hoặc gói không có hạn. */
  proExpiresAt: string | null;
}

export interface PaymentTransactionDto {
  id: string;
  sessionId: string;
  planId: string;
  amountVnd: number;
  /** VNPAY | MOMO | STRIPE | MOCK (kích hoạt thử ở môi trường phát triển). */
  paymentMethod: string;
  /** Pending | Paid | Failed. */
  status: string;
  createdAt: string;
  paidAt: string | null;
}
