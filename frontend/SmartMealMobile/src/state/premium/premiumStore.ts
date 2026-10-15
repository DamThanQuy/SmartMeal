import { create } from 'zustand';
import type { PaymentMethodId } from '@/features/premium/types/premium.types';

// BR-230/231 — Membership Status: Free/Premium/Expired/Cancelled, tính năng Premium chỉ mở khi
// gói còn hiệu lực. Global client state vì nhiều feature cần đọc (ai — quota AI, meal-planner —
// gợi ý AI tuần, profile — badge gói) nên đặt ở src/state theo .claude/rules/architecture.md, không
// phải state riêng của feature premium.
export type MembershipStatus = 'free' | 'premium' | 'expired' | 'cancelled';
export type BillingPlanId = 'monthly' | 'yearly';

/**
 * Gói còn hiệu lực. "Đã hủy" là đã hủy GIA HẠN: vẫn dùng Pro tới hết hạn (backend giữ IsPro cho tới
 * `proExpiresAt`), nên tính năng Pro vẫn mở — chỉ khi hết hạn mới thành "expired" (BR-232).
 */
export function isProMembership(status: MembershipStatus): boolean {
  return status === 'premium' || status === 'cancelled';
}

/** Trạng thái gói của người dùng — backend (GET /subscription/status) là nguồn sự thật. */
export interface MembershipSnapshot {
  status: MembershipStatus;
  planId: BillingPlanId | null;
  /** ISO date yyyy-MM-dd (giờ máy); null khi chưa từng có gói hoặc gói không có hạn. */
  expiresAtIso: string | null;
}

// design/Subscription.dc.html "Lịch sử giao dịch" — 5 trạng thái theo BR-241/242. Đặt cùng chỗ
// với MembershipStatus/BillingPlanId (không phải features/premium/types) vì TransactionRecord
// cần PaymentMethodId từ premium.types.ts, mà premium.types.ts lại cần BillingPlanId/
// MembershipStatus từ đây — đặt cả 2 phía trong 1 file tránh vòng import.
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'Đang chờ',
  success: 'Thành công',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
};

export interface TransactionRecord {
  id: string;
  planId: BillingPlanId;
  paymentMethodId: PaymentMethodId;
  amountVnd: number;
  status: TransactionStatus;
  /** ISO datetime — thời điểm khởi tạo giao dịch. */
  createdAtIso: string;
  /** Ghi chú ngắn, vd. "Giao dịch không thành công, bạn chưa bị trừ tiền" (design/Subscription.dc.html). */
  note?: string;
}

interface PremiumState {
  status: MembershipStatus;
  planId: BillingPlanId | null;
  /** ISO date yyyy-MM-dd — null khi chưa có gói. */
  expiresAtIso: string | null;
  /** Nạp trạng thái gói do server báo (đăng nhập, mở màn Gói của tôi, sau khi thanh toán/hủy). */
  hydrateMembership: (snapshot: MembershipSnapshot) => void;
  // BR-232 — hết hạn → về Free Access, dữ liệu cá nhân giữ nguyên (chỉ đổi status ở đây).
  expireMembership: () => void;
  /** Về Free — đăng xuất/đổi tài khoản (gói là của từng tài khoản). Khác `expireMembership` (status
   * luôn về 'free', không phải 'expired'). */
  resetToFree: () => void;
}

// Danh sách giao dịch KHÔNG nằm ở đây: là dữ liệu của server (GET /subscription/transactions, đọc qua
// TanStack Query) và không bị xóa bởi DeleteDataScreen (BR-271).
export const usePremiumStore = create<PremiumState>()(set => ({
  status: 'free',
  planId: null,
  expiresAtIso: null,
  hydrateMembership: snapshot =>
    set({
      status: snapshot.status,
      planId: snapshot.planId,
      expiresAtIso: snapshot.expiresAtIso,
    }),
  expireMembership: () => set({ status: 'expired', planId: null, expiresAtIso: null }),
  resetToFree: () => set({ status: 'free', planId: null, expiresAtIso: null }),
}));

/** Hook: gói còn hiệu lực (gồm "đã hủy gia hạn" nhưng chưa hết hạn) — để mở khóa tính năng Pro. */
export function useIsPro(): boolean {
  return usePremiumStore(state => isProMembership(state.status));
}
