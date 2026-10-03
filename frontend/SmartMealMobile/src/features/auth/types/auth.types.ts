import type { AuthUser } from '@/state/auth/authStore';

// Định nghĩa AuthUser nằm ở authStore (state dùng chung) — re-export để feature/screen vẫn import
// từ '@/features/auth' như cũ.
export type { AuthUser };

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  user: AuthUser;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  email: string;
  /** Tài khoản vừa tạo; hasCompletedSurvey = false → đi tiếp Health Profile. */
  user: AuthUser;
  /** true (mock) → màn Register chuyển sang OTP; false → vào thẳng wizard khảo sát: backend không
   * có xác thực OTP (docs/fetch-api/part1 D2). */
  requiresOtp: boolean;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

/** EditProfileScreen — chỉ họ tên đổi được (email gắn 1 tài khoản, BR-011). */
export interface UpdateProfilePayload {
  fullName: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

/** Kết quả mở phiên sau khi đăng nhập: có phải làm Health Profile trước khi vào Main không. */
export interface SessionOpenResult {
  user: AuthUser;
  needsSurvey: boolean;
}
