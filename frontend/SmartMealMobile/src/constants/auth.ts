/**
 * Quy tắc xác thực OTP/mật khẩu — khớp cấu hình backend (Auth:OtpMinutes, Auth:OtpResendCooldownSeconds,
 * độ dài mật khẩu ở RegisterRequestDto/ResetPasswordRequestDto). Đổi ở backend thì đổi ở đây.
 */
export const AUTH_RULES = {
  OTP_LENGTH: 6,
  /** Mã OTP có hiệu lực bao lâu (phút). */
  OTP_VALIDITY_MINUTES: 5,
  /** Khoảng chờ tối thiểu giữa hai lần gửi mã (giây). */
  OTP_RESEND_COOLDOWN_SECONDS: 60,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  /** Dung lượng ảnh đại diện tối đa (byte) — khớp giới hạn của POST /auth/avatar. */
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
} as const;
