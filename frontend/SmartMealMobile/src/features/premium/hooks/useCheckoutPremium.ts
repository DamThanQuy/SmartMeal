import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AI_QUOTA_QUERY_KEY } from '@/constants/queryKeys';
import { usePremiumStore, type BillingPlanId } from '@/state/premium/premiumStore';
import { premiumService } from '../services/premiumService';
import type { SelectablePaymentMethodId } from '../types/premium.types';
import { SUBSCRIPTION_QUERY_KEY } from './queryKeys';

// Thanh toán xong (server đã xác nhận) → nạp gói mới vào store và làm mới những nơi phụ thuộc gói:
// trạng thái/lịch sử giao dịch và hạn mức AI (Pro không giới hạn, BR-233).
export function useCheckoutPremium() {
  const queryClient = useQueryClient();
  const hydrateMembership = usePremiumStore(state => state.hydrateMembership);
  return useMutation({
    mutationFn: ({
      planId,
      paymentMethodId,
    }: {
      planId: BillingPlanId;
      paymentMethodId: SelectablePaymentMethodId;
    }) => premiumService.checkout(planId, paymentMethodId),
    onSuccess: result => {
      hydrateMembership(result.membership);
    },
    // Cả khi lỗi/chưa xác nhận: lịch sử giao dịch có thêm dòng mới (đang chờ/thất bại) và gói có thể đã
    // đổi ở server (webhook về muộn) nên đọc lại thay vì giữ số liệu cũ.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
    },
  });
}
