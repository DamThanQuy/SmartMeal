import type { BillingPlanId } from '@/state/premium/premiumStore';

// BR-230→BR-233, BR-241/242 — Membership Status + Payment Verification.

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
