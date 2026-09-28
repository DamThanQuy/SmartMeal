import { addMonths, addYears, format } from 'date-fns';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { BILLING_PLAN_OPTIONS } from '../mocks/premium.mock';
import type { CheckoutResult, PaymentMethodId } from '../types/premium.types';

// TODO: replace mock with real API — BR-241/242 (Payment Verification) yêu cầu Backend xác
// nhận qua Webhook/Server-to-Server, KHÔNG tin client-side callback. Mock ở đây mô phỏng đúng
// độ trễ "đang chờ xác nhận" (1.6–2.5s) độc lập với MOCK_SCENARIO delay thường (400–800ms) vì
// đây là luồng thanh toán, không phải load dữ liệu.
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let transactionCounter = 0;
function nextTransactionId(): string {
  transactionCounter += 1;
  return `TXN-${Date.now()}-${transactionCounter}`;
}

export const premiumService = {
  async checkout(planId: BillingPlanId, paymentMethodId: PaymentMethodId): Promise<CheckoutResult> {
    const scenario = getCurrentMockScenario();
    await wait(1600 + Math.random() * 900);
    if (scenario === 'error') {
      throw new Error('Giao dịch không thành công, bạn chưa bị trừ tiền.');
    }

    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
    const expires = planId === 'yearly' ? addYears(new Date(), 1) : addMonths(new Date(), 1);

    return {
      transactionId: nextTransactionId(),
      amountVnd: plan?.priceVnd ?? 0,
      planId,
      paymentMethodId,
      expiresAtIso: format(expires, 'yyyy-MM-dd'),
    };
  },
};
