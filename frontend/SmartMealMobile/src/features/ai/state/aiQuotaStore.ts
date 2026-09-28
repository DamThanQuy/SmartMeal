import { create } from 'zustand';
import { isPremiumActive } from '@/state/premium/premiumStore';

// BR-233 — Free user bị giới hạn số lượt dùng AI/ngày. Quota chỉ dùng trong feature ai
// (QuickLog/Dashboard chỉ đọc `remaining` qua features/ai/index.ts) nên đặt local theo
// .claude/rules/architecture.md thay vì src/state global.
//
// Mock: quota reset lúc 00:00 trên Backend thật — ở đây chỉ giữ trong bộ nhớ phiên (reset khi
// mở lại app), khởi tạo usedToday=2 để khớp số liệu ví dụ trong design ("Còn 3/5 lượt").
export const DAILY_AI_QUOTA_LIMIT = 5;

interface AiQuotaState {
  usedToday: number;
  /** Chỉ tăng khi AI phân tích THÀNH CÔNG — thất bại "Lượt AI này không bị trừ" (StateAIFailed). */
  consumeQuota: () => void;
  reset: () => void;
}

export const useAiQuotaStore = create<AiQuotaState>()(set => ({
  usedToday: 2,
  consumeQuota: () =>
    set(state => ({ usedToday: Math.min(state.usedToday + 1, DAILY_AI_QUOTA_LIMIT) })),
  reset: () => set({ usedToday: 0 }),
}));

export function getAiQuotaRemaining(): number {
  return Math.max(DAILY_AI_QUOTA_LIMIT - useAiQuotaStore.getState().usedToday, 0);
}

// BR-233 — chỉ Free user mới bị chặn khi hết quota; Premium còn hạn thì luôn còn lượt.
export function hasAiQuotaRemaining(): boolean {
  return isPremiumActive() || getAiQuotaRemaining() > 0;
}
