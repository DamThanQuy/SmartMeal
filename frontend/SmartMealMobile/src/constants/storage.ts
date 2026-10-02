export const STORAGE_KEYS = {
  THEME_MODE: 'app.themeMode',
  MOCK_SCENARIO: 'app.mockScenario',
  LANGUAGE: 'app.language',
  /** + userId — phần hồ sơ sức khỏe backend không lưu (chế độ ăn, dị ứng/bệnh lý không có id…). */
  PROFILE_EXTRAS_PREFIX: 'user.profileExtras.',
} as const;

/**
 * Khóa expo-secure-store (token nhạy cảm — KHÔNG dùng AsyncStorage). SecureStore chỉ nhận khóa
 * gồm chữ/số và `.`, `-`, `_`.
 */
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
} as const;
