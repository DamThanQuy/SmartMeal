// DTO của backend cho /subscription/* (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper
// import file này, hook/screen chỉ biết type FE trong premium.types.ts.

export type ApiPlanId = 'PRO_MONTHLY' | 'PRO_YEARLY';
export type ApiPaymentMethod = 'VNPAY' | 'MOMO' | 'STRIPE' | 'PAYOS';

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
  /** Mã đơn PayOS — chỉ có với PAYOS, dùng cho GET /subscription/check-status/{orderCode}. */
  orderCode?: number | null;
  paymentUrl: string;
  qrCodeUrl: string | null;
  /** Chuỗi VietQR gốc (PAYOS). */
  qrCode?: string | null;
  amountVnd: number;
  message: string;
}

/** GET /subscription/check-status/{orderCode} — máy chủ hỏi PayOS và kích hoạt Pro nếu đã nhận đủ tiền. */
export interface PaymentTransactionStatusDto {
  orderCode: number;
  /** Pending | Paid | Failed. */
  status: string;
  isPaid: boolean;
  planId: string;
  amountVnd: number;
  paidAt: string | null;
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
  /** VNPAY | MOMO | STRIPE | PAYOS | MOCK (kích hoạt thử ở môi trường phát triển). */
  paymentMethod: string;
  /** Pending | Paid | Failed. */
  status: string;
  createdAt: string;
  paidAt: string | null;
}
