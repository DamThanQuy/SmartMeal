import type {
  BillingPlanId,
  MembershipSnapshot,
  MembershipStatus,
} from '@/state/premium/premiumStore';

// BR-230→BR-233, BR-241/242 — Membership Status + Payment Verification.

// Nhãn hiển thị theo MembershipStatus — dùng chung cho AppBadge ở ProfileScreen (dạng đầy đủ) và
// ProfileMenuRow "Gói của tôi" ở SettingsScreen (dạng ngắn, Đợt 9), tránh định nghĩa lặp lại.
export const MEMBERSHIP_BADGE_LABEL: Record<MembershipStatus, string> = {
  free: 'Gói Free',
  premium: 'Gói Pro',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
};

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  free: 'Free',
  premium: 'Pro',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
};

/**
 * 'payos' = chuyển khoản VietQR qua cổng PayOS (cổng thật duy nhất đã tích hợp). 'mock' chỉ xuất hiện trong lịch
 * sử: giao dịch do công tắc kích hoạt thử của backend ở môi trường phát triển.
 */
export type PaymentMethodId = 'vnpay' | 'momo' | 'card' | 'payos' | 'mock';

/** Phương thức người dùng có thể chọn khi thanh toán (không gồm 'mock'). */
export type SelectablePaymentMethodId = Exclude<PaymentMethodId, 'mock'>;

/** Nhãn hiển thị của mọi phương thức, gồm cả 'mock' (không nằm trong danh sách để chọn). */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  vnpay: 'VNPAY',
  momo: 'MoMo',
  card: 'Thẻ quốc tế',
  payos: 'PayOS (VietQR)',
  mock: 'Kích hoạt thử (dev)',
};

export interface BillingPlanOption {
  id: BillingPlanId;
  label: string;
  priceLabel: string;
  billingLabel: string;
  priceVnd: number;
}

export interface PaymentMethodOption {
  id: SelectablePaymentMethodId;
  label: string;
}

export interface FeatureComparisonRow {
  label: string;
  freeValueLabel?: string;
  freeIncluded: boolean;
  proValueLabel?: string;
}

/**
 * Phiên thanh toán vừa tạo — với PayOS, màn hình hiện mã QR/nút mở trang PayOS trong lúc chờ server xác nhận.
 * `orderCode` chỉ có với PayOS.
 */
export interface CheckoutSession {
  sessionId: string;
  orderCode: number | null;
  paymentUrl: string;
  /** Ảnh mã QR (URL) để hiển thị; null nếu cổng không có QR. */
  qrCodeUrl: string | null;
  amountVnd: number;
}

export interface CheckoutOptions {
  /** Gọi ngay khi đã tạo phiên (trước khi chờ xác nhận). */
  onSession?: (session: CheckoutSession) => void;
  /** Hủy việc chờ xác nhận (vd. người dùng rời màn hình) — checkout ném PaymentCancelledError. */
  signal?: AbortSignal;
}

export interface CheckoutResult {
  transactionId: string;
  amountVnd: number;
  planId: BillingPlanId;
  paymentMethodId: PaymentMethodId;
  /** ISO date yyyy-MM-dd; null khi gói không có hạn. */
  expiresAtIso: string | null;
  /** Trạng thái gói do server xác nhận sau giao dịch (nạp vào premiumStore). */
  membership: MembershipSnapshot;
}

// TransactionStatus/TransactionRecord/TRANSACTION_STATUS_LABEL (design/Subscription.dc.html,
// BR-241/242) định nghĩa ở src/state/premium/premiumStore.ts (cùng chỗ với
// MembershipStatus/BillingPlanId) — import trực tiếp từ đó, không lặp lại ở đây.
