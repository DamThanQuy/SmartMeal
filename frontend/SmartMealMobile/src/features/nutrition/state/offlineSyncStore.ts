import { create } from 'zustand';

export interface PendingSyncEntry {
  /** = MealLogEntry.id — dùng để badge đúng dòng trong DiaryFoodRow. */
  id: string;
  label: string;
  timeLabel: string;
}

interface OfflineSyncState {
  pending: PendingSyncEntry[];
  enqueue: (entry: PendingSyncEntry) => void;
  clear: () => void;
}

// design/StateOffline.dc.html (BR-261/262) — hàng đợi mock cho banner "Đang offline" ở
// DiaryScreen. Mock service (nutritionService) luôn áp dụng thay đổi ngay lập tức (không có
// network layer thật) nên hàng đợi ở đây CHỈ là badge hiển thị "Chờ đồng bộ", không phải nguồn
// dữ liệu — tắt "Offline" ở màn Dev (appStore.isOfflineDevOverride) sẽ clear() ngay, mô phỏng
// đồng bộ xong không nhân đôi (dữ liệu đã áp dụng từ lúc mutate(), không gửi lại).
export const useOfflineSyncStore = create<OfflineSyncState>()(set => ({
  pending: [],
  enqueue: entry => set(state => ({ pending: [...state.pending, entry] })),
  clear: () => set({ pending: [] }),
}));
