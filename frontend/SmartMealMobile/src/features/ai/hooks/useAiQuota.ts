import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AI_QUOTA_QUERY_KEY } from '@/constants/queryKeys';
import { useIsPro } from '@/state/premium/premiumStore';
import { formatQuotaResetTime } from '../services/ai.mapper';
import { aiService } from '../services/aiService';
import { DAILY_AI_QUOTA_LIMIT } from '../state/aiQuotaStore';

// BR-233 — chỉ Free user bị giới hạn lượt AI/ngày; Pro còn hạn thì không giới hạn (BR-230/231).
// Hạn mức là dữ liệu của server (GET /ai/quota); lúc chưa đọc được thì KHÔNG chặn người dùng — server
// vẫn kiểm tra khi gọi AI (429) nên số hiển thị chỉ để tham khảo.
export function useAiQuota() {
  const queryClient = useQueryClient();
  const isPro = useIsPro();
  const { data: quota, isLoading } = useQuery({
    queryKey: AI_QUOTA_QUERY_KEY,
    queryFn: () => aiService.getQuota(),
  });

  const isUnlimited = quota?.isUnlimited ?? isPro;
  const limit = quota?.limit ?? DAILY_AI_QUOTA_LIMIT;
  const remaining = quota?.remaining ?? limit;

  return {
    isLoading,
    isUnlimited,
    usedToday: quota?.used ?? 0,
    /** Số lượt còn lại (Free); Pro không giới hạn nên dùng `isUnlimited`. */
    remaining,
    /** Số lượt miễn phí mỗi ngày (Free). */
    limit,
    hasRemaining: isUnlimited || remaining > 0,
    /** Giờ làm mới hạn mức theo giờ máy ("00:00" ở Việt Nam); rỗng khi chưa đọc được. */
    resetTimeLabel: quota ? formatQuotaResetTime(quota) : '',
    /**
     * Gọi sau mỗi lần AI phân tích THÀNH CÔNG: bản thật để server đếm rồi đọc lại hạn mức, bản mock tự
     * đếm cục bộ. Thất bại thì không gọi (lượt AI không bị trừ — StateAIFailed).
     */
    consumeQuota: () => {
      void aiService
        .recordUsage()
        .catch(() => undefined)
        .finally(() => {
          void queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
        });
    },
  };
}

/** Làm mới hạn mức (vd. sau khi AI báo hết lượt) mà không cần hook đầy đủ. */
export function useRefreshAiQuota() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
}
