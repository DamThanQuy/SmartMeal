import { DAILY_AI_QUOTA_LIMIT, useAiQuotaStore } from '../state/aiQuotaStore';

export function useAiQuota() {
  const usedToday = useAiQuotaStore(state => state.usedToday);
  const consumeQuota = useAiQuotaStore(state => state.consumeQuota);
  const remaining = Math.max(DAILY_AI_QUOTA_LIMIT - usedToday, 0);

  return {
    usedToday,
    remaining,
    limit: DAILY_AI_QUOTA_LIMIT,
    hasRemaining: remaining > 0,
    consumeQuota,
  };
}
