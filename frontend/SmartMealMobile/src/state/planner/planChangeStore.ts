import { create } from 'zustand';
import { registerUserDataReset } from '@/state/resetUserData';

// Thời điểm thực đơn của từng tuần được sửa trên máy này (meal-planner ghi, grocery đọc): danh sách
// đi chợ được sinh từ thực đơn và BE không tự cập nhật khi thực đơn đổi, nên Grocery so mốc này với
// thời điểm tạo danh sách để nhắc "Thực đơn đã đổi — Tạo lại danh sách" (docs/fetch-api/part2 §3.2).
// Đặt ở src/state vì hai feature cùng dùng (.claude/rules/architecture.md). Chỉ là gợi ý trên UI,
// không phải dữ liệu nghiệp vụ nên giữ trong bộ nhớ.
interface PlanChangeState {
  /** weekStartIso → thời điểm sửa gần nhất (ms). */
  changedAt: Record<string, number>;
  markPlanChanged: (weekStartIso: string) => void;
}

export const usePlanChangeStore = create<PlanChangeState>()(set => ({
  changedAt: {},
  markPlanChanged: weekStartIso =>
    set(state => ({ changedAt: { ...state.changedAt, [weekStartIso]: Date.now() } })),
}));

registerUserDataReset('planChanges', () => usePlanChangeStore.setState({ changedAt: {} }));
