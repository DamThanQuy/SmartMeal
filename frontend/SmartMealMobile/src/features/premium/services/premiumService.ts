import { addMonths, addYears, format } from 'date-fns';
import { request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { ENV } from '@/config/env';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import type { CheckoutResult, PaymentMethodId } from '../types/premium.types';

export const premiumService = {
  async checkout(planId: BillingPlanId, paymentMethodId: PaymentMethodId): Promise<CheckoutResult> {
    const apiPlanId = planId === 'monthly' ? 'PRO_MONTHLY' : 'PRO_YEARLY';
    const apiPaymentMethod = paymentMethodId === 'vnpay' ? 'VNPAY' : paymentMethodId === 'momo' ? 'MOMO' : 'STRIPE';
    const session = await request<{
      sessionId: string;
      paymentUrl: string;
      qrCodeUrl: string | null;
      amountVnd: number;
    }>({
      method: 'POST',
      url: ENDPOINTS.subscription.checkout,
      data: { planId: apiPlanId, paymentMethod: apiPaymentMethod },
    });

    if (ENV.appEnv !== 'production') {
      await request<boolean>({
        method: 'POST',
        url: ENDPOINTS.subscription.activateMock,
        data: { planId: apiPlanId, paymentMethod: apiPaymentMethod },
      });
    }

    const expires = planId === 'yearly' ? addYears(new Date(), 1) : addMonths(new Date(), 1);

    return {
      transactionId: session.sessionId,
      amountVnd: session.amountVnd,
      planId,
      paymentMethodId,
      expiresAtIso: format(expires, 'yyyy-MM-dd'),
    };
  },
};
