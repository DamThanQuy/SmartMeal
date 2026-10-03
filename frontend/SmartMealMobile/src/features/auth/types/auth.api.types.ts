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
  /** Free | Premium | Expired | Cancelled. */
  subscriptionStatus: string;
  /** Hạn dùng gói Pro (ISO 8601 UTC); null nếu chưa có. */
  proExpiresAt: string | null;
  role: string;
  /** BE tính bằng `user.HealthProfile != null`. */
  hasCompletedSurvey: boolean;
}

export interface AuthResponseDto {
  /** Access token (JWT) ngắn hạn. */
  token: string;
  /** ISO 8601 UTC. */
  expiresAt: string;
  /** Dùng một lần ở POST /auth/refresh để lấy cặp token mới. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: UserDto;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}
