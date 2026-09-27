import { create } from 'zustand';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  /**
   * Họ tên/email từ RegisterScreen, giữ tạm trong lúc user đi qua OTP + 7 bước Health Profile
   * (chưa login() nên chưa vào MainNavigator) — HealthResultScreen dùng để login() khi bấm
   * "Bắt đầu với SmartMeal".
   */
  pendingUser: { fullName: string; email: string } | null;
  setPendingUser: (user: { fullName: string; email: string }) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
}

// Global client state — trạng thái đăng nhập cần cho AppNavigator (Auth/Main switch) và
// nhiều feature khác, đúng vai trò src/state/auth theo docs/structure_system.md mục 13.
//
// Nhánh feat/mock-ui: KHÔNG lưu access/refresh token thật (đăng nhập không kiểm tra thật —
// CLAUDE.md mục 8) nên chưa cần secureStorage ở đây. Khi nối API thật, login() sẽ nhận thêm
// token và lưu qua src/services/storage/secureStorage.ts (Keychain), không lưu ở store này.
export const useAuthStore = create<AuthState>()(set => ({
  isAuthenticated: false,
  user: null,
  pendingUser: null,
  setPendingUser: user => set({ pendingUser: user }),
  login: user => set({ isAuthenticated: true, user, pendingUser: null }),
  logout: () => set({ isAuthenticated: false, user: null, pendingUser: null }),
}));
