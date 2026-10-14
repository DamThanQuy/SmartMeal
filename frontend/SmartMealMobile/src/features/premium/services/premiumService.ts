import { addMonths, addYears, format } from 'date-fns';
import { request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import type {
  CheckoutResult,
  CheckoutSessionData,
  PaymentMethodId,
  PaymentStatusResult,
} from '../types/premium.types';

export const premiumService = {
  async createCheckoutSession(
    planId: BillingPlanId,
    paymentMethodId: PaymentMethodId,
  ): Promise<CheckoutSessionData> {
    const apiPlanId = planId === 'monthly' ? 'PRO_MONTHLY' : 'PRO_YEARLY';
    const apiPaymentMethod =
      paymentMethodId === 'payos'
        ? 'PAYOS'
        : paymentMethodId === 'vnpay'
          ? 'VNPAY'
          : paymentMethodId === 'momo'
            ? 'MOMO'
            : 'STRIPE';

    return await request<CheckoutSessionData>({
      method: 'POST',
      url: ENDPOINTS.subscription.checkout,
      data: { planId: apiPlanId, paymentMethod: apiPaymentMethod },
    });
  },

  async checkPaymentStatus(orderCode: number): Promise<PaymentStatusResult> {
    return await request<PaymentStatusResult>({
      method: 'GET',
      url: ENDPOINTS.subscription.checkStatus(orderCode),
    });
  },

  async checkout(planId: BillingPlanId, paymentMethodId: PaymentMethodId): Promise<CheckoutResult> {
    const session = await this.createCheckoutSession(planId, paymentMethodId);
    const expires = planId === 'yearly' ? addYears(new Date(), 1) : addMonths(new Date(), 1);

    return {
      transactionId: session.sessionId,
      orderCode: session.orderCode,
      paymentUrl: session.paymentUrl,
      qrCodeUrl: session.qrCodeUrl,
      amountVnd: session.amountVnd,
      planId,
      paymentMethodId,
      expiresAtIso: format(expires, 'yyyy-MM-dd'),
    };
  },
};
