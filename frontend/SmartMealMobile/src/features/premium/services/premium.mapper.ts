import type {
  BillingPlanId,
  MembershipSnapshot,
  MembershipStatus,
  TransactionRecord,
  TransactionStatus,
} from '@/state/premium/premiumStore';
import { formatDateIso, parseApiDateTime } from '@/utils/date';
import type {
  ApiPaymentMethod,
  ApiPlanId,
  PaymentTransactionDto,
  SubscriptionPlanDto,
  SubscriptionStatusDto,
} from '../types/premium.api.types';
import type {
  BillingPlanOption,
  PaymentMethodId,
  SelectablePaymentMethodId,
} from '../types/premium.types';

// Hàm thuần quy đổi DTO /subscription/* ↔ type FE (docs/fetch-api/part1 §13). Không gọi API, không
// đọc store — để test bằng fixture JSON.

const API_PLAN_ID: Record<BillingPlanId, ApiPlanId> = {
  monthly: 'PRO_MONTHLY',
  yearly: 'PRO_YEARLY',
};

const API_PAYMENT_METHOD: Record<SelectablePaymentMethodId, ApiPaymentMethod> = {
  vnpay: 'VNPAY',
  momo: 'MOMO',
  card: 'STRIPE',
};

// Nhãn hiển thị theo chu kỳ — tên gói dài của BE ("Gói Tháng (Pro Monthly)") không dùng cho UI.
const PLAN_PRESENTATION: Record<BillingPlanId, { label: string; billingLabel: string }> = {
  monthly: { label: 'Theo tháng', billingLabel: 'Thanh toán mỗi tháng' },
  yearly: { label: 'Theo năm', billingLabel: 'Thanh toán mỗi năm' },
};

const PENDING_NOTE = 'Pro chỉ kích hoạt sau khi giao dịch được xác nhận';
const FAILED_NOTE = 'Giao dịch không thành công, bạn chưa bị trừ tiền';

export function toApiPlanId(planId: BillingPlanId): ApiPlanId {
  return API_PLAN_ID[planId];
}

export function fromApiPlanId(value: string | null | undefined): BillingPlanId | null {
  const normalized = value?.trim().toUpperCase();
  const planIds = Object.keys(API_PLAN_ID) as BillingPlanId[];
  return planIds.find(planId => API_PLAN_ID[planId] === normalized) ?? null;
}

export function toApiPaymentMethod(paymentMethodId: SelectablePaymentMethodId): ApiPaymentMethod {
  return API_PAYMENT_METHOD[paymentMethodId];
}

/** VNPAY/MOMO/STRIPE → id FE; MOCK → 'mock'; giá trị lạ → 'vnpay' (phương thức mặc định của BE). */
export function fromApiPaymentMethod(value: string): PaymentMethodId {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MOCK') return 'mock';
  const methodIds = Object.keys(API_PAYMENT_METHOD) as SelectablePaymentMethodId[];
  return methodIds.find(methodId => API_PAYMENT_METHOD[methodId] === normalized) ?? 'vnpay';
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

/** Gói của BE → lựa chọn hiển thị; gói lạ (chưa có trong FE) bị bỏ. */
export function fromPlanDto(dto: SubscriptionPlanDto): BillingPlanOption | null {
  const id = fromApiPlanId(dto.id);
  if (!id) return null;
  return {
    id,
    label: PLAN_PRESENTATION[id].label,
    priceLabel: formatVnd(dto.priceVnd),
    billingLabel: PLAN_PRESENTATION[id].billingLabel,
    priceVnd: dto.priceVnd,
  };
}

const MEMBERSHIP_STATUS: Record<string, MembershipStatus> = {
  free: 'free',
  premium: 'premium',
  expired: 'expired',
  cancelled: 'cancelled',
};

/** Ngày hết hạn theo GIỜ MÁY ("yyyy-MM-dd"); chuỗi hỏng hoặc null → null. */
function toLocalDateIso(value: string | null): string | null {
  if (!value) return null;
  const date = parseApiDateTime(value);
  return Number.isNaN(date.getTime()) ? null : formatDateIso(date);
}

export function fromStatusDto(dto: SubscriptionStatusDto): MembershipSnapshot {
  return {
    status: MEMBERSHIP_STATUS[dto.status.trim().toLowerCase()] ?? 'free',
    planId: fromApiPlanId(dto.planId),
    expiresAtIso: toLocalDateIso(dto.proExpiresAt),
  };
}

const TRANSACTION_STATUS: Record<string, TransactionStatus> = {
  pending: 'pending',
  paid: 'success',
  failed: 'failed',
};

/** Giao dịch có gói lạ (không còn trong FE) bị bỏ; trạng thái lạ coi là đang chờ. */
export function fromTransactionDto(dto: PaymentTransactionDto): TransactionRecord | null {
  const planId = fromApiPlanId(dto.planId);
  if (!planId) return null;

  const status = TRANSACTION_STATUS[dto.status.trim().toLowerCase()] ?? 'pending';
  const createdAt = parseApiDateTime(dto.createdAt);
  return {
    id: dto.id,
    planId,
    paymentMethodId: fromApiPaymentMethod(dto.paymentMethod),
    amountVnd: dto.amountVnd,
    status,
    createdAtIso: Number.isNaN(createdAt.getTime()) ? dto.createdAt : createdAt.toISOString(),
    note: status === 'pending' ? PENDING_NOTE : status === 'failed' ? FAILED_NOTE : undefined,
  };
}
