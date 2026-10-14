import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AI_QUOTA_QUERY_KEY } from '@/constants/queryKeys';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { premiumService } from '../services/premiumService';
import {
  SUBSCRIPTION_PLANS_QUERY_KEY,
  SUBSCRIPTION_STATUS_QUERY_KEY,
  SUBSCRIPTION_TRANSACTIONS_QUERY_KEY,
} from './queryKeys';

// Dữ liệu gói thành viên đọc từ server qua TanStack Query; trạng thái gói còn được nạp vào
// premiumStore (client state) vì nhiều feature cần đọc nó để mở khóa tính năng Pro.

/** Bảng giá các gói — giá và chu kỳ do BE quyết định. */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: SUBSCRIPTION_PLANS_QUERY_KEY,
    queryFn: () => premiumService.getPlans(),
    // Bảng giá ít đổi: không cần tải lại mỗi lần mở màn.
    staleTime: 5 * 60 * 1000,
  });
}

/** Trạng thái gói hiện tại; mỗi lần đọc xong nạp vào premiumStore (gói có thể đổi bằng webhook/thiết bị khác). */
export function useSubscriptionStatus() {
  const hydrateMembership = usePremiumStore(state => state.hydrateMembership);
  return useQuery({
    queryKey: SUBSCRIPTION_STATUS_QUERY_KEY,
    queryFn: async () => {
      const membership = await premiumService.getStatus();
      hydrateMembership(membership);
      return membership;
    },
  });
}

/** Lịch sử giao dịch (mới → cũ) — dữ liệu của server, không bị xóa bởi "Xóa dữ liệu cá nhân" (BR-271). */
export function useSubscriptionTransactions() {
  return useQuery({
    queryKey: SUBSCRIPTION_TRANSACTIONS_QUERY_KEY,
    queryFn: () => premiumService.getTransactions(),
  });
}

/** Hủy gia hạn: vẫn dùng Pro tới hết hạn. */
export function useCancelRenewal() {
  const queryClient = useQueryClient();
  const hydrateMembership = usePremiumStore(state => state.hydrateMembership);
  return useMutation({
    mutationFn: () => premiumService.cancelRenewal(),
    onSuccess: membership => {
      hydrateMembership(membership);
      void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_STATUS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
    },
  });
}
