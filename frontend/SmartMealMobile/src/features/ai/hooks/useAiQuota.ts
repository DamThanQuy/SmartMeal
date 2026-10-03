import { useIsPro } from '@/state/premium/premiumStore';
import { DAILY_AI_QUOTA_LIMIT, useAiQuotaStore } from '../state/aiQuotaStore';

// BR-233 — chỉ Free user mới bị kiểm tra quota AI; Premium còn hạn thì không giới hạn
// (BR-230/231).
export function useAiQuota() {
  const usedToday = useAiQuotaStore(state => state.usedToday);
  const consumeQuota = useAiQuotaStore(state => state.consumeQuota);
  const isPremium = useIsPro();
  const remaining = Math.max(DAILY_AI_QUOTA_LIMIT - usedToday, 0);

  return {
    usedToday,
    remaining,
    limit: DAILY_AI_QUOTA_LIMIT,
    hasRemaining: isPremium || remaining > 0,
    consumeQuota,
  };
}
