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
 * 'sepay' = chuyển khoản VietQR thẳng vào tài khoản ngân hàng (SePay báo tiền vào); 'payos' = chuyển khoản VietQR qua
 * cổng PayOS. 'vnpay' | 'momo' | 'card' | 'mock' chỉ còn trong lịch sử: giao dịch của các cổng giả lập trước đây và của
 * công tắc kích hoạt thử ở môi trường phát triển.
 */
export type PaymentMethodId = 'sepay' | 'payos' | 'vnpay' | 'momo' | 'card' | 'mock';

/** Phương thức người dùng có thể chọn khi thanh toán — chỉ các cổng thật. */
export type SelectablePaymentMethodId = 'sepay' | 'payos';

/** Nhãn hiển thị của mọi phương thức, gồm cả các giá trị chỉ có trong lịch sử. */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  sepay: 'Chuyển khoản ngân hàng',
  payos: 'PayOS (VietQR)',
  vnpay: 'VNPAY',
  momo: 'MoMo',
  card: 'Thẻ quốc tế',
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

// design/Premium.dc.html — "[GIÁ]" trong artboard là placeholder của công cụ design, chưa có
// giá thật từ Backend nên chọn mức phổ biến của app dinh dưỡng/AI tại VN để minh hoạ (CẦN xác
// nhận giá thật khi có bảng giá Premium chính thức).
export const BILLING_PLAN_OPTIONS: BillingPlanOption[] = [
  {
    id: 'monthly',
    label: 'Theo tháng',
    priceLabel: '79.000đ',
    billingLabel: 'Thanh toán mỗi tháng',
    priceVnd: 79000,
  },
  {
    id: 'yearly',
    label: 'Theo năm',
    priceLabel: '699.000đ',
    billingLabel: 'Thanh toán mỗi năm',
    priceVnd: 699000,
  },
];

// PayOS đứng đầu: là cổng thật duy nhất đã tích hợp (chuyển khoản VietQR); các phương thức còn lại chưa có cổng thật.
export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { id: 'sepay', label: 'Chuyển khoản ngân hàng (VietQR)' },
  { id: 'payos', label: 'PayOS – chuyển khoản VietQR' },
];

export const FEATURE_COMPARISON_ROWS: FeatureComparisonRow[] = [
  {
    label: 'AI Snap & Voice',
    freeValueLabel: '5 lượt/ngày',
    freeIncluded: true,
    proValueLabel: 'Không giới hạn',
  },
  { label: 'Quét tủ lạnh bằng AI', freeIncluded: false },
  { label: 'Tự tạo thực đơn tuần bằng AI', freeIncluded: false },
  { label: 'Gợi ý theo bệnh lý & dị ứng', freeIncluded: true },
  { label: 'Nhật ký, công thức, đi chợ', freeIncluded: true },
];

/**
 * Phiên thanh toán vừa tạo — màn hình hiện mã VietQR (và thông tin chuyển khoản với SePay) trong lúc chờ server xác
 * nhận theo `orderCode`.
 */
export interface CheckoutSession {
  sessionId: string;
  orderCode: number | null;
  paymentUrl: string;
  /** Ảnh mã QR (URL) để hiển thị; null nếu cổng không có QR. */
  qrCodeUrl: string | null;
  amountVnd: number;
  /** SePay: tài khoản nhận và nội dung chuyển khoản bắt buộc — để chuyển tay nếu không quét được QR. */
  bankTransfer?: BankTransferInfo;
}

export interface BankTransferInfo {
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  transferContent: string;
  /** ISO 8601 — hết thời gian hiển thị mã (tiền tới sau hạn vẫn được ghi nhận); null nếu server không đặt hạn. */
  expiresAtIso: string | null;
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
