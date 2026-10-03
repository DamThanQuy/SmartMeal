/**
 * Hook gói thành viên (docs/fetch-api/part1 §13): đọc trạng thái/lịch sử/bảng giá từ server qua
 * TanStack Query, nạp gói vào premiumStore sau khi thanh toán hoặc hủy gia hạn và làm mới những nơi
 * phụ thuộc gói (lịch sử giao dịch, hạn mức AI). Service được mock.
 */
import { AI_QUOTA_QUERY_KEY } from '@/constants/queryKeys';
import { useCheckoutPremium } from '@/features/premium/hooks/useCheckoutPremium';
import {
  SUBSCRIPTION_QUERY_KEY,
  SUBSCRIPTION_STATUS_QUERY_KEY,
} from '@/features/premium/hooks/queryKeys';
import {
  useCancelRenewal,
  useSubscriptionPlans,
  useSubscriptionStatus,
  useSubscriptionTransactions,
} from '@/features/premium/hooks/useSubscription';
import { premiumService } from '@/features/premium/services/premiumService';
import { usePremiumStore, type MembershipSnapshot } from '@/state/premium/premiumStore';
import { renderHookWithQuery } from '../../test-utils/renderHookWithQuery';

jest.mock('@/features/premium/services/premiumService', () => ({
  premiumService: {
    getPlans: jest.fn(),
    getStatus: jest.fn(),
    getTransactions: jest.fn(),
    checkout: jest.fn(),
    cancelRenewal: jest.fn(),
  },
}));

const service = premiumService as jest.Mocked<typeof premiumService>;

const PRO: MembershipSnapshot = { status: 'premium', planId: 'monthly', expiresAtIso: '2026-11-02' };

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.getState().resetToFree();
});

describe('useSubscriptionStatus', () => {
  test('đọc trạng thái từ server và nạp vào premiumStore', async () => {
    service.getStatus.mockResolvedValue(PRO);
    const hook = await renderHookWithQuery(() => useSubscriptionStatus());

    await hook.flush();

    expect(hook.current.data).toEqual(PRO);
    expect(usePremiumStore.getState()).toMatchObject(PRO);
    expect(hook.queryClient.getQueryData(SUBSCRIPTION_STATUS_QUERY_KEY)).toEqual(PRO);
    await hook.unmount();
  });

  test('server lỗi → store giữ nguyên trạng thái đang có', async () => {
    usePremiumStore.getState().hydrateMembership(PRO);
    service.getStatus.mockRejectedValue(new Error('máy chủ lỗi'));
    const hook = await renderHookWithQuery(() => useSubscriptionStatus());

    await hook.flush();

    expect(hook.current.isError).toBe(true);
    expect(usePremiumStore.getState()).toMatchObject(PRO);
    await hook.unmount();
  });
});

describe('useSubscriptionPlans / useSubscriptionTransactions', () => {
  test('bảng giá và lịch sử giao dịch lấy từ service', async () => {
    const plans = [
      { id: 'monthly' as const, label: 'Theo tháng', priceLabel: '79.000đ', billingLabel: '', priceVnd: 79000 },
    ];
    const transactions = [
      {
        id: 't1',
        planId: 'monthly' as const,
        paymentMethodId: 'vnpay' as const,
        amountVnd: 79000,
        status: 'success' as const,
        createdAtIso: '2026-10-02T03:00:00.000Z',
      },
    ];
    service.getPlans.mockResolvedValue(plans);
    service.getTransactions.mockResolvedValue(transactions);
    const plansHook = await renderHookWithQuery(() => useSubscriptionPlans());
    const transactionsHook = await renderHookWithQuery(() => useSubscriptionTransactions());

    await plansHook.flush();
    await transactionsHook.flush();

    expect(plansHook.current.data).toEqual(plans);
    expect(transactionsHook.current.data).toEqual(transactions);
    await plansHook.unmount();
    await transactionsHook.unmount();
  });
});

describe('useCheckoutPremium', () => {
  const RESULT = {
    transactionId: 'SES_1',
    amountVnd: 79000,
    planId: 'monthly' as const,
    paymentMethodId: 'vnpay' as const,
    expiresAtIso: '2026-11-02',
    membership: PRO,
  };

  test('thanh toán xong (server đã xác nhận) → nạp gói vào store, làm mới giao dịch và hạn mức AI', async () => {
    service.checkout.mockResolvedValue(RESULT);
    const hook = await renderHookWithQuery(() => useCheckoutPremium());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await hook.run(() => hook.current.mutateAsync({ planId: 'monthly', paymentMethodId: 'vnpay' }));

    expect(service.checkout).toHaveBeenCalledWith('monthly', 'vnpay');
    expect(usePremiumStore.getState()).toMatchObject(PRO);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SUBSCRIPTION_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AI_QUOTA_QUERY_KEY });
    await hook.unmount();
  });

  test('lỗi/chưa xác nhận → KHÔNG kích hoạt Pro ở máy, nhưng vẫn đọc lại gói và lịch sử từ server', async () => {
    const error = new Error('Chưa nhận được xác nhận thanh toán.');
    service.checkout.mockRejectedValue(error);
    const hook = await renderHookWithQuery(() => useCheckoutPremium());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await expect(
      hook.run(() => hook.current.mutateAsync({ planId: 'monthly', paymentMethodId: 'vnpay' })),
    ).rejects.toBe(error);

    expect(usePremiumStore.getState().status).toBe('free');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SUBSCRIPTION_QUERY_KEY });
    await hook.unmount();
  });
});

describe('useCancelRenewal', () => {
  test('hủy gia hạn → store thành "đã hủy" (vẫn còn hạn), làm mới trạng thái và hạn mức AI', async () => {
    usePremiumStore.getState().hydrateMembership(PRO);
    service.cancelRenewal.mockResolvedValue({ ...PRO, status: 'cancelled' });
    const hook = await renderHookWithQuery(() => useCancelRenewal());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await hook.run(() => hook.current.mutateAsync());

    expect(usePremiumStore.getState()).toMatchObject({
      status: 'cancelled',
      planId: 'monthly',
      expiresAtIso: '2026-11-02',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SUBSCRIPTION_STATUS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AI_QUOTA_QUERY_KEY });
    await hook.unmount();
  });

  test('BE từ chối → store giữ nguyên', async () => {
    usePremiumStore.getState().hydrateMembership(PRO);
    const error = new Error('Bạn chưa có gói Pro đang hoạt động để hủy.');
    service.cancelRenewal.mockRejectedValue(error);
    const hook = await renderHookWithQuery(() => useCancelRenewal());

    await expect(hook.run(() => hook.current.mutateAsync())).rejects.toBe(error);

    expect(usePremiumStore.getState().status).toBe('premium');
    await hook.unmount();
  });
});
