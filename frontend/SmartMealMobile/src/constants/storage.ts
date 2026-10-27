export const STORAGE_KEYS = {
  THEME_MODE: 'app.themeMode',
  /** + userId — phần hồ sơ sức khỏe backend không lưu (chế độ ăn, dị ứng/bệnh lý không có id…). */
  PROFILE_EXTRAS_PREFIX: 'user.profileExtras.',
  /** + userId — bật/tắt nhắc nhở cục bộ (bữa ăn, nước, chuỗi ngày). */
  REMINDERS_PREFIX: 'user.reminders.',
  /** + userId — các lần ghi món chưa gửi được (hàng đợi offline, kèm Idempotency-Key). */
  OFFLINE_QUEUE_PREFIX: 'user.offlineQueue.',
} as const;

/**
 * Khóa expo-secure-store (token nhạy cảm — KHÔNG dùng AsyncStorage). SecureStore chỉ nhận khóa
 * gồm chữ/số và `.`, `-`, `_`.
 */
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  /** Dùng một lần để lấy cặp token mới ở POST /auth/refresh (BE xoay vòng mỗi lần dùng). */
  REFRESH_TOKEN: 'auth.refreshToken',
} as const;
