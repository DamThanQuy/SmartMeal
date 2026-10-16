import type {
  BillingPlanId,
  MembershipSnapshot,
  MembershipStatus,
} from '@/state/premium/premiumStore';
import type { PaymentCheckTrigger } from '../services/paymentCheckTrigger';

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
 * 'bank_app' = mở thẳng app ngân hàng người dùng chọn, điền sẵn thông tin (link dl.vietqr.io); 'sepay' = quét mã VietQR
 * chuyển thẳng vào tài khoản ngân hàng (SePay báo tiền vào) — cả hai cùng tài khoản SePay; 'payos' = chuyển khoản VietQR
 * qua cổng PayOS. Chỉ còn trong lịch sử: 'bank_transfer' (chuyển khoản STK — đã bỏ, gộp vào 'bank_app'), 'vnpay' | 'momo'
 * | 'card' | 'mock' (cổng giả lập trước đây và công tắc kích hoạt thử ở môi trường phát triển).
 */
export type PaymentMethodId = 'sepay' | 'payos' | 'bank_transfer' | 'bank_app' | 'vnpay' | 'momo' | 'card' | 'mock';

/** Phương thức có mã QR → màn PaymentPending. */
export type QrPaymentMethodId = 'sepay' | 'payos';

/** Phương thức người dùng có thể chọn khi thanh toán — chỉ các cổng thật. */
export type SelectablePaymentMethodId = 'bank_app' | QrPaymentMethodId;

/** Nhãn hiển thị của mọi phương thức, gồm cả các giá trị chỉ có trong lịch sử. */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  sepay: 'Quét mã VietQR (SePay)',
  payos: 'PayOS (VietQR)',
  bank_transfer: 'Chuyển khoản STK',
  bank_app: 'Mở app ngân hàng',
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
  description: string;
  /** Gắn nhãn "Đề xuất" — tiện nhất khi dùng trên điện thoại. */
  recommended?: boolean;
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
// Thứ tự hiển thị; phương thức đầu tiên được chọn sẵn. Đang dùng trên điện thoại thì không quét được QR trên chính màn
// hình đó nên "Mở app ngân hàng" đứng đầu; QR (SePay) cho trường hợp trả bằng máy khác.
export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'bank_app',
    label: 'Mở app ngân hàng',
    description: 'Mở thẳng app ngân hàng của bạn, điền sẵn thông tin',
    recommended: true,
  },
  { id: 'sepay', label: 'Quét mã VietQR (SePay)', description: 'Quét bằng app ngân hàng trên máy khác' },
  { id: 'payos', label: 'PayOS', description: 'Quét mã hoặc mở trang thanh toán PayOS' },
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
  /** Mã VietQR viết thường của ngân hàng nhận (vd. "mb") — để app ngân hàng điền sẵn; không có nếu BE không nhận ra. */
  vietQrBankCode?: string;
}

export interface CheckoutOptions {
  /** Gọi ngay khi đã tạo phiên (trước khi chờ xác nhận). */
  onSession?: (session: CheckoutSession) => void;
  /** Hủy việc chờ xác nhận (vd. người dùng rời màn hình) — checkout ném PaymentCancelledError. */
  signal?: AbortSignal;
  /** Hỏi trạng thái ngay thay vì đợi nhịp kế tiếp ("Tôi đã chuyển khoản", quay lại app). */
  trigger?: PaymentCheckTrigger;
  /** Gọi mỗi lần server trả lời giao dịch vẫn đang chờ (chưa nhận được tiền). */
  onPending?: () => void;
  /** PayOS: deep link để trang thanh toán chuyển về app (paymentReturnUrl). */
  returnUrl?: string;
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
