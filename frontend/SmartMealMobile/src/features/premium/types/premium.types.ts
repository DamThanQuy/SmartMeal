import type { BillingPlanId, MembershipStatus } from '@/state/premium/premiumStore';

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

export type PaymentMethodId = 'vnpay' | 'momo' | 'card';

export interface BillingPlanOption {
  id: BillingPlanId;
  label: string;
  priceLabel: string;
  billingLabel: string;
  priceVnd: number;
}

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
}

export interface FeatureComparisonRow {
  label: string;
  freeValueLabel?: string;
  freeIncluded: boolean;
  proValueLabel?: string;
}

export interface CheckoutResult {
  transactionId: string;
  amountVnd: number;
  planId: BillingPlanId;
  paymentMethodId: PaymentMethodId;
  /** ISO date yyyy-MM-dd. */
  expiresAtIso: string;
}

// TransactionStatus/TransactionRecord/TRANSACTION_STATUS_LABEL (design/Subscription.dc.html,
// BR-241/242) định nghĩa ở src/state/premium/premiumStore.ts (cùng chỗ với
// MembershipStatus/BillingPlanId) — import trực tiếp từ đó, không lặp lại ở đây.
