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

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isPro: boolean;
  role: string;
  /** BE tính bằng `user.HealthProfile != null`. */
  hasCompletedSurvey: boolean;
}

export interface AuthResponseDto {
  /** JWT, sống 30 ngày; không có refresh token. */
  token: string;
  /** ISO 8601 UTC. */
  expiresAt: string;
  user: UserDto;
}
