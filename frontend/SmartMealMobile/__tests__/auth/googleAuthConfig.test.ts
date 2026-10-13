import { resolveGoogleAuthConfig } from '@/features/auth/services/googleAuthConfig';

describe('resolveGoogleAuthConfig', () => {
  const ids = { web: 'web.apps.googleusercontent.com', android: 'android.apps.googleusercontent.com' };

  test('có Client ID của nền tảng đang chạy → trả đủ các ID cho expo-auth-session', () => {
    expect(resolveGoogleAuthConfig('android', ids)).toEqual({
      webClientId: ids.web,
      androidClientId: ids.android,
      iosClientId: undefined,
    });
    expect(resolveGoogleAuthConfig('web', ids)).not.toBeNull();
  });

  test('thiếu Client ID của nền tảng → null (nút báo chưa cấu hình, không gọi hook để tránh lỗi)', () => {
    expect(resolveGoogleAuthConfig('ios', ids)).toBeNull();
    expect(resolveGoogleAuthConfig('android', {})).toBeNull();
  });
});
