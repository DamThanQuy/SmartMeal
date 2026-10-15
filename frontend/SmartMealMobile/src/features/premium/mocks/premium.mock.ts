import type { TransactionRecord } from '@/state/premium/premiumStore';
import type {
  BillingPlanOption,
  FeatureComparisonRow,
  PaymentMethodOption,
} from '../types/premium.types';

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

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { id: 'vnpay', label: 'VNPAY' },
  { id: 'momo', label: 'MoMo' },
  { id: 'card', label: 'Thẻ quốc tế' },
];

export const FEATURE_COMPARISON_MOCK: FeatureComparisonRow[] = [
  {
    label: 'AI Snap & Voice',
    freeValueLabel: '5 lượt/ngày',
    freeIncluded: true,
    proValueLabel: 'Không giới hạn',
  },
  { label: 'Fridge Scanner', freeIncluded: false },
  { label: 'Meal Plan nâng cao', freeIncluded: false },
  { label: 'Gợi ý theo bệnh lý', freeIncluded: false },
  { label: 'Nhật ký, công thức, đi chợ', freeIncluded: true },
];

// design/Subscription.dc.html — 3 giao dịch mẫu khớp artboard (Thành công/Thất bại/Đang chờ) +
// 2 giao dịch minh hoạ thêm để đủ 5 trạng thái BR-241/242 (Cancelled/Expired không có trong
// artboard gốc nhưng cần thể hiện được trong mô hình dữ liệu). Chỉ dùng khi chạy mock; gọi API thật
// thì lịch sử là của server.
export const TRANSACTIONS_MOCK: TransactionRecord[] = [
  {
    id: 'txn-seed-1',
    planId: 'yearly',
    paymentMethodId: 'vnpay',
    amountVnd: 699000,
    status: 'success',
    createdAtIso: '2026-09-01T09:12:00',
  },
  {
    id: 'txn-seed-2',
    planId: 'monthly',
    paymentMethodId: 'momo',
    amountVnd: 79000,
    status: 'failed',
    createdAtIso: '2026-08-14T20:03:00',
    note: 'Giao dịch không thành công, bạn chưa bị trừ tiền',
  },
  {
    id: 'txn-seed-3',
    planId: 'monthly',
    paymentMethodId: 'card',
    amountVnd: 79000,
    status: 'pending',
    createdAtIso: '2026-08-10T11:40:00',
    note: 'Pro chỉ kích hoạt sau khi giao dịch được xác nhận',
  },
  {
    id: 'txn-seed-4',
    planId: 'monthly',
    paymentMethodId: 'vnpay',
    amountVnd: 79000,
    status: 'cancelled',
    createdAtIso: '2026-07-20T15:22:00',
    note: 'Bạn đã hủy trước khi hoàn tất thanh toán',
  },
  {
    id: 'txn-seed-5',
    planId: 'monthly',
    paymentMethodId: 'momo',
    amountVnd: 79000,
    status: 'expired',
    createdAtIso: '2026-07-05T08:00:00',
    note: 'Phiên thanh toán đã hết hạn',
  },
];
