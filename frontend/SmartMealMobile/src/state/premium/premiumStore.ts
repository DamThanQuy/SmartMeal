import { create } from 'zustand';

// BR-230/231 — Membership Status: Free/Premium/Expired/Cancelled, tính năng Premium chỉ mở khi
// status = Premium và còn hạn. Global client state vì nhiều feature cần đọc (ai — quota AI,
// meal-planner — gợi ý AI tuần, profile — badge gói) nên đặt ở src/state theo
// .claude/rules/architecture.md, không phải state riêng của feature premium.
export type MembershipStatus = 'free' | 'premium' | 'expired' | 'cancelled';
export type BillingPlanId = 'monthly' | 'yearly';

interface PremiumState {
  status: MembershipStatus;
  planId: BillingPlanId | null;
  /** ISO date yyyy-MM-dd — null khi status = 'free'. */
  expiresAtIso: string | null;
  // BR-241/242 — chỉ gọi khi Backend (mock: sau khi "webhook" xác nhận) báo thành công, không
  // bao giờ gọi ngay khi user bấm "Nâng cấp Pro" (xem features/premium PaymentPendingScreen).
  activatePremium: (planId: BillingPlanId, expiresAtIso: string) => void;
  // BR-232 — hết hạn → về Free Access, dữ liệu cá nhân giữ nguyên (chỉ đổi status ở đây).
  expireMembership: () => void;
}

export const usePremiumStore = create<PremiumState>()(set => ({
  status: 'free',
  planId: null,
  expiresAtIso: null,
  activatePremium: (planId, expiresAtIso) => set({ status: 'premium', planId, expiresAtIso }),
  expireMembership: () => set({ status: 'expired', planId: null, expiresAtIso: null }),
}));

/** Đọc trạng thái Premium ngoài React tree (trong service, không dùng hook được) — dùng cho
 * BR-233 (giới hạn AI chỉ áp dụng khi Free). */
export function isPremiumActive(): boolean {
  return usePremiumStore.getState().status === 'premium';
}
