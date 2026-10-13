import { ENV } from '@/config/env';

export interface GoogleClientIds {
  web?: string;
  android?: string;
  ios?: string;
}

export interface GoogleAuthClientConfig {
  webClientId?: string;
  androidClientId?: string;
  iosClientId?: string;
}

export type GooglePlatform = 'web' | 'android' | 'ios' | 'windows' | 'macos';

export const GOOGLE_NOT_CONFIGURED_MESSAGE =
  'Đăng nhập Google chưa được cấu hình trên bản này. Bạn có thể đăng nhập bằng email.';

/**
 * Cấu hình cho Google.useIdTokenAuthRequest. Null khi nền tảng đang chạy chưa có Client ID — hook của
 * expo-auth-session ném lỗi nếu thiếu, nên chỉ gọi hook khi hàm này trả cấu hình.
 */
export function resolveGoogleAuthConfig(
  platform: GooglePlatform,
  ids: GoogleClientIds = ENV.googleClientIds,
): GoogleAuthClientConfig | null {
  const platformId = platform === 'android' ? ids.android : platform === 'ios' ? ids.ios : ids.web;
  if (!platformId) return null;
  return { webClientId: ids.web, androidClientId: ids.android, iosClientId: ids.ios };
}
