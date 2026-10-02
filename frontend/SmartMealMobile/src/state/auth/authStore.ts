import { create } from 'zustand';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

/**
 * Lý do rời khỏi MainNavigator lần gần nhất — AuthNavigator dùng để chọn initialRouteName
 * (Login khi expired/locked, Welcome với các trường hợp còn lại — xem AuthNavigator.tsx,
 * StateSessionScreen.tsx).
 */
export type AuthExitReason = 'logout' | 'expired' | 'locked' | 'guest';

export interface AuthState {
  isAuthenticated: boolean;
  /** BR §2.1 — Guest chỉ xem nội dung công khai/khám phá công thức, không có user thật.
   * AppNavigator render Main khi isAuthenticated HOẶC isGuest (xem AppNavigator.tsx). */
  isGuest: boolean;
  user: AuthUser | null;
  /**
   * Họ tên/email từ RegisterScreen, giữ tạm trong lúc user đi qua OTP + 7 bước Health Profile
   * (chưa login() nên chưa vào MainNavigator) — HealthResultScreen dùng để login() khi bấm
   * "Bắt đầu với SmartMeal". `id` chỉ có khi backend đã tạo tài khoản (chế độ API).
   */
  pendingUser: { id?: string; fullName: string; email: string } | null;
  /** null khi chưa từng rời Main (ví dụ mở app lần đầu) — xem AuthExitReason. */
  lastExitReason: AuthExitReason | null;
  setPendingUser: (user: { id?: string; fullName: string; email: string }) => void;
  login: (user: AuthUser) => void;
  /** Guest bấm "Khám phá công thức không cần đăng nhập" (Welcome/Main.dc.html — design v2). */
  continueAsGuest: () => void;
  /** reason mặc định 'logout' (Đăng xuất chủ động) — StateSessionScreen truyền 'expired'/'locked',
   * GuestPromptScreen truyền 'guest' khi thoát Guest mode. */
  logout: (reason?: AuthExitReason) => void;
  /** EditProfileScreen (Đợt 9) — chỉ sửa field cho phép đổi (họ tên); email chỉ đọc (BR-011). */
  updateUser: (patch: Partial<Pick<AuthUser, 'fullName'>>) => void;
}

// Global client state — trạng thái đăng nhập cần cho AppNavigator (Auth/Main switch) và
// nhiều feature khác, đúng vai trò src/state/auth theo docs/structure_system.md mục 13.
//
// Nhánh feat/mock-ui: KHÔNG lưu access/refresh token thật (đăng nhập không kiểm tra thật —
// CLAUDE.md mục 8) nên chưa cần secureStorage ở đây. Khi nối API thật, login() sẽ nhận thêm
// token và lưu qua src/services/storage/secureStorage.ts (Keychain), không lưu ở store này.
export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  isGuest: false,
  user: null,
  pendingUser: null,
  lastExitReason: null,
  setPendingUser: user => set({ pendingUser: user }),
  login: user =>
    set({ isAuthenticated: true, isGuest: false, user, pendingUser: null, lastExitReason: null }),
  continueAsGuest: () => set({ isAuthenticated: false, isGuest: true, user: null }),
  logout: (reason = 'logout') =>
    set({
      isAuthenticated: false,
      isGuest: false,
      user: null,
      pendingUser: null,
      lastExitReason: reason,
    }),
  updateUser: patch => {
    const currentUser = get().user;
    if (!currentUser) return;
    set({ user: { ...currentUser, ...patch } });
  },
}));

/**
 * Id user hiện tại ngoài React tree (service không dùng hook được) — gồm cả user đang trong
 * onboarding (đã có tài khoản, chưa vào Main). null khi chưa đăng nhập/Guest/mock chưa có id thật.
 */
export function getCurrentUserId(): string | null {
  const { user, pendingUser } = useAuthStore.getState();
  return user?.id ?? pendingUser?.id ?? null;
}
