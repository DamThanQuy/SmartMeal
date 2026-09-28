import { create } from 'zustand';
import type { PaymentMethodId } from '@/features/premium/types/premium.types';

// BR-230/231 — Membership Status: Free/Premium/Expired/Cancelled, tính năng Premium chỉ mở khi
// status = Premium và còn hạn. Global client state vì nhiều feature cần đọc (ai — quota AI,
// meal-planner — gợi ý AI tuần, profile — badge gói) nên đặt ở src/state theo
// .claude/rules/architecture.md, không phải state riêng của feature premium.
export type MembershipStatus = 'free' | 'premium' | 'expired' | 'cancelled';
export type BillingPlanId = 'monthly' | 'yearly';

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
  /** ISO date yyyy-MM-dd — null khi status = 'free'. */
  expiresAtIso: string | null;
  /** SubscriptionScreen (Đợt 13) "Tự động gia hạn" — tắt chỉ dừng gia hạn lần tới, KHÔNG kết
   * thúc Premium đang hoạt động ngay (đúng UX subscription thông thường). */
  autoRenew: boolean;
  // BR-241/242 — chỉ gọi khi Backend (mock: sau khi "webhook" xác nhận) báo thành công, không
  // bao giờ gọi ngay khi user bấm "Nâng cấp Pro" (xem features/premium PaymentPendingScreen).
  activatePremium: (planId: BillingPlanId, expiresAtIso: string) => void;
  // BR-232 — hết hạn → về Free Access, dữ liệu cá nhân giữ nguyên (chỉ đổi status ở đây).
  expireMembership: () => void;
  /** Màn Dev (ThemePreviewScreen, Đợt 11) — công tắc Free/Pro để demo PlannerRegenerate/Fridge
   * Scanner gate (BR-230/231) mà không cần đi hết luồng thanh toán. Khác `expireMembership`
   * (status luôn về 'free', không phải 'expired'). */
  resetToFree: () => void;
  setAutoRenew: (value: boolean) => void;

  /** SubscriptionScreen "Lịch sử giao dịch" (Đợt 13, BR-241/242) — KHÔNG đăng ký resetUserData,
   * dữ liệu thanh toán được giữ lại theo BR-271 (giống premiumStore nói chung). */
  transactions: TransactionRecord[];
  addTransaction: (record: TransactionRecord) => void;
  updateTransactionStatus: (id: string, status: TransactionStatus, note?: string) => void;
}

// design/Subscription.dc.html — 3 giao dịch mẫu khớp artboard (Thành công/Thất bại/Đang chờ) +
// 2 giao dịch minh hoạ thêm để đủ 5 trạng thái BR-241/242 (Cancelled/Expired không có trong
// artboard gốc nhưng cần thể hiện được trong mô hình dữ liệu).
const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'txn-seed-1',
    planId: 'yearly',
    paymentMethodId: 'vnpay',
    amountVnd: 699000,
    status: 'success',
    createdAtIso: '2026-09-01T09:12:00',
  },
  {
    id: 'txn-seed-2',
    planId: 'monthly',
    paymentMethodId: 'momo',
    amountVnd: 79000,
    status: 'failed',
    createdAtIso: '2026-08-14T20:03:00',
    note: 'Giao dịch không thành công, bạn chưa bị trừ tiền',
  },
  {
    id: 'txn-seed-3',
    planId: 'monthly',
    paymentMethodId: 'card',
    amountVnd: 79000,
    status: 'pending',
    createdAtIso: '2026-08-10T11:40:00',
    note: 'Pro chỉ kích hoạt sau khi giao dịch được xác nhận',
  },
  {
    id: 'txn-seed-4',
    planId: 'monthly',
    paymentMethodId: 'vnpay',
    amountVnd: 79000,
    status: 'cancelled',
    createdAtIso: '2026-07-20T15:22:00',
    note: 'Bạn đã hủy trước khi hoàn tất thanh toán',
  },
  {
    id: 'txn-seed-5',
    planId: 'monthly',
    paymentMethodId: 'momo',
    amountVnd: 79000,
    status: 'expired',
    createdAtIso: '2026-07-05T08:00:00',
    note: 'Phiên thanh toán đã hết hạn',
  },
];

export const usePremiumStore = create<PremiumState>()(set => ({
  status: 'free',
  planId: null,
  expiresAtIso: null,
  autoRenew: true,
  activatePremium: (planId, expiresAtIso) => set({ status: 'premium', planId, expiresAtIso }),
  expireMembership: () => set({ status: 'expired', planId: null, expiresAtIso: null }),
  resetToFree: () => set({ status: 'free', planId: null, expiresAtIso: null }),
  setAutoRenew: value => set({ autoRenew: value }),

  transactions: INITIAL_TRANSACTIONS,
  addTransaction: record => set(state => ({ transactions: [record, ...state.transactions] })),
  updateTransactionStatus: (id, status, note) =>
    set(state => ({
      transactions: state.transactions.map(transaction =>
        transaction.id === id ? { ...transaction, status, note: note ?? transaction.note } : transaction,
      ),
    })),
}));

/** Đọc trạng thái Premium ngoài React tree (trong service, không dùng hook được) — dùng cho
 * BR-233 (giới hạn AI chỉ áp dụng khi Free). */
export function isPremiumActive(): boolean {
  return usePremiumStore.getState().status === 'premium';
}
