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

/** Đăng nhập Google: gửi Google ID token để máy chủ tự xác minh chữ ký/audience (không gửi email do client tự khai). */
export interface GoogleLoginPayload {
  idToken: string;
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

/** Mục đích mã OTP: xác thực email lúc đăng ký (chỉ mock — BE không bắt OTP khi đăng ký) hoặc đặt lại mật khẩu. */
export type OtpPurpose = 'register' | 'reset-password';

export interface VerifyOtpPayload {
  email: string;
  code: string;
  purpose: OtpPurpose;
}

export interface VerifyOtpResult {
  /** Chỉ có với mục đích reset-password: dùng một lần ở bước đặt mật khẩu mới (hiệu lực ngắn). */
  resetToken?: string;
}

export interface ResendOtpPayload {
  email: string;
  purpose: OtpPurpose;
}

export interface ResetPasswordPayload {
  email: string;
  resetToken: string;
  newPassword: string;
}

/** EditProfileScreen — chỉ họ tên đổi được (email gắn 1 tài khoản, BR-011). */
export interface UpdateProfilePayload {
  fullName: string;
}

/** Ảnh đại diện đã chọn trên máy (đường dẫn cục bộ) để tải lên. */
export interface UploadAvatarPayload {
  uri: string;
  mimeType: string;
  fileName: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

/** Kết quả mở phiên sau khi đăng nhập: có phải làm Health Profile trước khi vào Main không. */
export interface SessionOpenResult {
  user: AuthUser;
  needsSurvey: boolean;
}
