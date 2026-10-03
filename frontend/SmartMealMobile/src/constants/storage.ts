export const STORAGE_KEYS = {
  THEME_MODE: 'app.themeMode',
  MOCK_SCENARIO: 'app.mockScenario',
  LANGUAGE: 'app.language',
  /** + userId — phần hồ sơ sức khỏe backend không lưu (chế độ ăn, dị ứng/bệnh lý không có id…). */
  PROFILE_EXTRAS_PREFIX: 'user.profileExtras.',
  /** + userId — tùy chọn Health Connect cục bộ (đã kết nối, nguồn nào bật). */
  HEALTH_CONNECT_PREFIX: 'user.healthConnect.',
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
