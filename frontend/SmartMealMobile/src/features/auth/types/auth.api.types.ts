// DTO của backend cho /auth/* (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper import file
// này, hook/screen chỉ biết type FE trong auth.types.ts.

export interface RegisterRequestDto {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface UpdateProfileRequestDto {
  /** Chuỗi rỗng/khoảng trắng bị BE bỏ qua. */
  fullName?: string;
  /** BE chỉ lưu chuỗi URL — không có endpoint upload ảnh. */
  avatarUrl?: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  /** Quyền Pro còn hiệu lực — nguồn đáng tin duy nhất (claim trong token sẽ cũ sau khi nâng cấp). */
  isPro: boolean;
  /** Free | Premium | Expired | Cancelled; không có trong UserDto backend hiện tại. */
  subscriptionStatus?: string;
  /** Hạn dùng gói Pro (ISO 8601 UTC); chưa có trong UserDto backend hiện tại. */
  proExpiresAt?: string | null;
  role: string;
  /** BE tính bằng `user.HealthProfile != null`. */
  hasCompletedSurvey: boolean;
}

export interface AuthResponseDto {
  /** Access token (JWT) ngắn hạn. */
  token: string;
  /** ISO 8601 UTC. */
  expiresAt: string;
  /** Chỉ có khi backend cấp refresh token; backend hiện tại chưa trả trường này. */
  refreshToken?: string | null;
  /** Có khi backend cấp refresh token; chưa được backend hiện tại trả về. */
  refreshTokenExpiresAt?: string | null;
  user: UserDto;
}

export interface GoogleLoginRequestDto {
  idToken: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

/** BE nhận mục đích dạng slug: 'reset-password' | 'verify-email'. */
export type OtpPurposeDto = 'reset-password' | 'verify-email';

export interface ResendOtpRequestDto {
  email: string;
  purpose: OtpPurposeDto;
}

export interface VerifyOtpRequestDto {
  email: string;
  /** Đúng 6 chữ số. */
  code: string;
  purpose: OtpPurposeDto;
}

export interface VerifyOtpResponseDto {
  verified: boolean;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
}

export interface ResetPasswordRequestDto {
  email: string;
  resetToken: string;
  newPassword: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}
