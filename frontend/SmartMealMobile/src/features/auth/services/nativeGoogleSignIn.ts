import { Platform } from 'react-native';
import { IS_EXPO_GO } from '@/config/runtime';

type NativeGoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

/** Google Sign-In native: có trên dev build / bản chính thức (Android, iOS); Expo Go không có phần native của thư viện. */
export const isNativeGoogleSignInAvailable = Platform.OS !== 'web' && !IS_EXPO_GO;

/** Có đăng nhập Google: web dùng nút Google Identity Services, app native dùng thư viện native. */
export const isGoogleSignInSupported = Platform.OS === 'web' || isNativeGoogleSignInAvailable;

let nativeModule: NativeGoogleSignInModule | null = null;

/**
 * Nạp thư viện Google Sign-In native khi cần, lần đầu thì cấu hình luôn. Không import ở đầu file: thiếu phần native
 * (Expo Go) thì thư viện báo lỗi ngay lúc được nạp, làm hỏng cả màn đăng nhập. null nếu không dùng được.
 */
export function loadNativeGoogleSignIn(): NativeGoogleSignInModule | null {
  if (!isNativeGoogleSignInAvailable) return null;
  if (!nativeModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- nạp có điều kiện, xem chú thích ở trên.
    nativeModule = require('@react-native-google-signin/google-signin') as NativeGoogleSignInModule;
    nativeModule.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      offlineAccess: true,
    });
  }
  return nativeModule;
}
