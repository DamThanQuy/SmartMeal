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
