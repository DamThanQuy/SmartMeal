import { create } from 'zustand';

export interface AppState {
  /** Màn Dev (Đợt 11, BR-261/262) — mô phỏng "đang offline" cho DiaryScreen (StateOffline.dc.html),
   * cộng với NetInfo thật. Công tắc dev/QA nên không đăng ký resetUserData. */
  isOfflineDevOverride: boolean;
  setOfflineDevOverride: (value: boolean) => void;
}

// Global client state (app-level settings) — dùng Zustand theo docs/state-and-api.md.
export const useAppStore = create<AppState>()(set => ({
  isOfflineDevOverride: false,
  setOfflineDevOverride: value => set({ isOfflineDevOverride: value }),
}));

/** Đọc trạng thái offline mô phỏng ngoài React tree (trong service/hook, không dùng hook được). */
export function isOfflineDevOverrideActive(): boolean {
  return useAppStore.getState().isOfflineDevOverride;
}
