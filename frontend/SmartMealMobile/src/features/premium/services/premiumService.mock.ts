import { addMonths, addYears } from 'date-fns';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import {
  getMembershipSnapshot,
  type BillingPlanId,
  type MembershipSnapshot,
  type TransactionRecord,
} from '@/state/premium/premiumStore';
import { formatDateIso } from '@/utils/date';
import { BILLING_PLAN_OPTIONS, TRANSACTIONS_MOCK } from '../mocks/premium.mock';
import type {
  BillingPlanOption,
  CheckoutResult,
  SelectablePaymentMethodId,
} from '../types/premium.types';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API=true) — bản gọi API thật nằm ở premiumService.api.ts,
// premiumService.ts chọn giữa hai bản. Trạng thái gói nằm ở premiumStore (đọc qua
// getMembershipSnapshot) còn lịch sử giao dịch giữ ở đây: KHÔNG đăng ký resetUserData vì dữ liệu
// thanh toán được giữ lại theo BR-271 (DeleteDataScreen, ITEMS_TO_KEEP).
// TODO: replace mock with real API — bản thật nằm ở premiumService.api.ts.
let transactions: TransactionRecord[] = TRANSACTIONS_MOCK.map(transaction => ({ ...transaction }));
let transactionIdCounter = 0;

async function simulateRequest(errorMessage: string): Promise<void> {
  const scenario = getCurrentMockScenario();
  await wait(getMockDelayMs(scenario));
  if (scenario === 'error') {
    throw new Error(errorMessage);
  }
}

function recordTransaction(
  record: Omit<TransactionRecord, 'id' | 'createdAtIso'>,
): TransactionRecord {
  transactionIdCounter += 1;
  const transaction: TransactionRecord = {
    ...record,
    id: `txn-${Date.now()}-${transactionIdCounter}`,
    createdAtIso: new Date().toISOString(),
  };
  transactions = [transaction, ...transactions];
  return transaction;
}

export const premiumMockService = {
  async getPlans(): Promise<BillingPlanOption[]> {
    await simulateRequest('Không thể tải bảng giá, vui lòng thử lại.');
    return BILLING_PLAN_OPTIONS;
  },

  // Mock không có server: trạng thái gói nằm ngay ở premiumStore nên "đọc từ server" là đọc lại nó.
  async getStatus(): Promise<MembershipSnapshot> {
    return getMembershipSnapshot();
  },

  async getTransactions(): Promise<TransactionRecord[]> {
    await simulateRequest('Không thể tải lịch sử giao dịch, vui lòng thử lại.');
    return transactions.map(transaction => ({ ...transaction }));
  },

  // BR-241/242 — Pro chỉ được kích hoạt khi "cổng thanh toán" (mock: sau khi Promise resolve) xác nhận.
  async checkout(
    planId: BillingPlanId,
    paymentMethodId: SelectablePaymentMethodId,
  ): Promise<CheckoutResult> {
    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
    const amountVnd = plan?.priceVnd ?? 0;

    try {
      await simulateRequest('Thanh toán không thành công, vui lòng thử lại.');
    } catch (error) {
      recordTransaction({
        planId,
        paymentMethodId,
        amountVnd,
        status: 'failed',
        note: 'Giao dịch không thành công, bạn chưa bị trừ tiền',
      });
      throw error;
    }

    const expiresAtIso = formatDateIso(
      planId === 'yearly' ? addYears(new Date(), 1) : addMonths(new Date(), 1),
    );
    const transaction = recordTransaction({ planId, paymentMethodId, amountVnd, status: 'success' });
    return {
      transactionId: transaction.id,
      amountVnd,
      planId,
      paymentMethodId,
      expiresAtIso,
      membership: { status: 'premium', planId, expiresAtIso },
    };
  },

  // Hủy GIA HẠN: vẫn dùng Pro tới hết hạn (giống backend), chỉ đổi trạng thái sang "đã hủy".
  async cancelRenewal(): Promise<MembershipSnapshot> {
    await simulateRequest('Không thể hủy gia hạn, vui lòng thử lại.');
    const current = getMembershipSnapshot();
    return current.status === 'premium' ? { ...current, status: 'cancelled' } : current;
  },
};
