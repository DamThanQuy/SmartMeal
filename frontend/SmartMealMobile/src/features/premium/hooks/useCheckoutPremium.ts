import { useMutation } from '@tanstack/react-query';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import { premiumService } from '../services/premiumService';
import type { PaymentMethodId } from '../types/premium.types';

export function useCheckoutPremium() {
  return useMutation({
    mutationFn: ({ planId, paymentMethodId }: { planId: BillingPlanId; paymentMethodId: PaymentMethodId }) =>
      premiumService.checkout(planId, paymentMethodId),
  });
}
