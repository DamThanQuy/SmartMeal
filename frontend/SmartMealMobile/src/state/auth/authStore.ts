import { create } from 'zustand';
import { ENV } from '@/config/env';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  /** Gói Pro hiện tại — lấy từ GET /auth/me (claim `isPro` trong token sẽ cũ sau khi nâng cấp). */
  isPro: boolean;
  role: string;
  /** false → tài khoản mới, phải làm Health Profile (wizard 7 bước) trước khi vào Main. */
  hasCompletedSurvey: boolean;
}

/**
 * Lý do rời khỏi MainNavigator lần gần nhất — AuthNavigator dùng để chọn initialRouteName
 * (Login khi expired/locked, Welcome với các trường hợp còn lại — xem AuthNavigator.tsx,
 * StateSessionScreen.tsx).
 */
export type AuthExitReason = 'logout' | 'expired' | 'locked' | 'guest';

/**
 * Khôi phục phiên lúc khởi động app (đọc token + GET /auth/me — sessionService.bootstrapSession):
 * 'loading' → 'ready', hoặc 'failed' khi lỗi mạng/máy chủ (token vẫn được giữ để thử lại).
 */
export type BootstrapStatus = 'loading' | 'ready' | 'failed';

export interface AuthState {
  isAuthenticated: boolean;
  /** BR §2.1 — Guest chỉ xem nội dung công khai/khám phá công thức, không có user thật.
   * AppNavigator render Main khi isAuthenticated HOẶC isGuest (xem AppNavigator.tsx). */
  isGuest: boolean;
  user: AuthUser | null;
  /**
   * Tài khoản đã tạo nhưng chưa làm xong Health Profile (đang đăng ký, hoặc đăng nhập/mở lại app
   * khi hasCompletedSurvey=false): giữ tạm lúc user đi qua 7 bước wizard (chưa login() nên chưa
   * vào MainNavigator) — HealthResultScreen dùng để login() khi bấm "Bắt đầu với SmartMeal".
   */
  pendingUser: AuthUser | null;
  /** null khi chưa từng rời Main (ví dụ mở app lần đầu) — xem AuthExitReason. */
  lastExitReason: AuthExitReason | null;
  bootstrapStatus: BootstrapStatus;
  /** Đã xử lý 401 (hết phiên) và đang mở màn "Phiên hết hạn" — tránh xử lý lặp khi nhiều request
   * cùng nhận 401. Reset ở login()/logout(). */
  sessionExpired: boolean;
  setBootstrapStatus: (status: BootstrapStatus) => void;
  markSessionExpired: () => void;
  setPendingUser: (user: AuthUser) => void;
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
// Access token KHÔNG nằm ở store này: chỉ ở expo-secure-store (+ cache bộ nhớ) qua
// services/storage/secureStorage.ts. Khi xóa phiên (đăng xuất/hết hạn), xem sessionService.
// Chế độ mock (EXPO_PUBLIC_USE_MOCK_API=true) vẫn đăng nhập không kiểm tra thật (CLAUDE.md mục 8)
// và không có phiên để khôi phục nên bootstrapStatus luôn 'ready'.
export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  isGuest: false,
  user: null,
  pendingUser: null,
  lastExitReason: null,
  bootstrapStatus: ENV.useMockApi ? 'ready' : 'loading',
  sessionExpired: false,
  setBootstrapStatus: status => set({ bootstrapStatus: status }),
  markSessionExpired: () => set({ sessionExpired: true }),
  setPendingUser: user => set({ pendingUser: user }),
  login: user =>
    set({
      isAuthenticated: true,
      isGuest: false,
      user,
      pendingUser: null,
      lastExitReason: null,
      sessionExpired: false,
    }),
  continueAsGuest: () => set({ isAuthenticated: false, isGuest: true, user: null }),
  logout: (reason = 'logout') =>
    set({
      isAuthenticated: false,
      isGuest: false,
      user: null,
      pendingUser: null,
      lastExitReason: reason,
      sessionExpired: false,
    }),
  updateUser: patch => {
    const currentUser = get().user;
    if (!currentUser) return;
    set({ user: { ...currentUser, ...patch } });
  },
}));

/**
 * Id user hiện tại ngoài React tree (service không dùng hook được) — gồm cả user đang trong
 * onboarding (đã có tài khoản, chưa vào Main). null khi chưa đăng nhập/Guest.
 */
export function getCurrentUserId(): string | null {
  const { user, pendingUser } = useAuthStore.getState();
  return user?.id ?? pendingUser?.id ?? null;
}
