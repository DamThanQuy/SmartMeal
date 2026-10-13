import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { AppText } from '@/components/ui';
import { ENV } from '@/config/env';
import { useCompleteSignIn } from '../hooks/useCompleteSignIn';
import { useGoogleLogin } from '../hooks/useGoogleLogin';
import {
  GOOGLE_NOT_CONFIGURED_MESSAGE,
  resolveGoogleAuthConfig,
  type GoogleAuthClientConfig,
} from '../services/googleAuthConfig';
import { AuthGoogleButton } from './AuthGoogleButton';

// Web: đóng popup OAuth và trả kết quả về trang gọi.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleSignInButtonProps {
  label: string;
}

function ErrorText({ message }: { message: string }) {
  return (
    <AppText variant="caption" color="error" className="text-center" accessibilityRole="alert">
      {message}
    </AppText>
  );
}

/** Lấy ID token qua expo-auth-session rồi gửi /auth/google — server xác minh token với Google (C03). */
function ConfiguredGoogleButton({ label, config }: GoogleSignInButtonProps & { config: GoogleAuthClientConfig }) {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest(config);
  const googleLogin = useGoogleLogin();
  const completeSignIn = useCompleteSignIn();
  const [promptError, setPromptError] = useState<string | null>(null);

  const handlePress = async () => {
    setPromptError(null);
    const result = await promptAsync();
    if (result.type === 'success') {
      const idToken = result.params.id_token;
      if (idToken) googleLogin.mutate({ idToken }, { onSuccess: completeSignIn });
      else setPromptError('Google không trả về ID token. Vui lòng thử lại.');
    } else if (result.type === 'error') {
      setPromptError(result.error?.message ?? 'Đăng nhập Google không thành công.');
    }
    // cancel/dismiss: người dùng tự đóng — không báo lỗi.
  };

  const errorMessage = promptError ?? (googleLogin.isError ? googleLogin.error.message : null);

  return (
    <View className="gap-xs">
      <AuthGoogleButton
        label={googleLogin.isPending ? 'Đang đăng nhập…' : label}
        disabled={!request || googleLogin.isPending}
        accessibilityState={{ busy: googleLogin.isPending, disabled: !request }}
        onPress={() => void handlePress()}
      />
      {errorMessage ? <ErrorText message={errorMessage} /> : null}
    </View>
  );
}

/** Bản mock: không có Google thật, gọi thẳng service mock để xem trọn luồng giao diện. */
function MockGoogleButton({ label }: GoogleSignInButtonProps) {
  const googleLogin = useGoogleLogin();
  const completeSignIn = useCompleteSignIn();
  return (
    <View className="gap-xs">
      <AuthGoogleButton
        label={googleLogin.isPending ? 'Đang đăng nhập…' : label}
        disabled={googleLogin.isPending}
        onPress={() => googleLogin.mutate({ idToken: 'mock-id-token' }, { onSuccess: completeSignIn })}
      />
      {googleLogin.isError ? <ErrorText message={googleLogin.error.message} /> : null}
    </View>
  );
}

/** Chưa có Client ID cho nền tảng này: nói rõ, không giả vờ đăng nhập. */
function UnconfiguredGoogleButton({ label }: GoogleSignInButtonProps) {
  const [showMessage, setShowMessage] = useState(false);
  return (
    <View className="gap-xs">
      <AuthGoogleButton label={label} onPress={() => setShowMessage(true)} />
      {showMessage ? (
        <AppText variant="caption" color="secondary" className="text-center">
          {GOOGLE_NOT_CONFIGURED_MESSAGE}
        </AppText>
      ) : null}
    </View>
  );
}

// design/Main.dc.html, Login.dc.html, Register.dc.html — nút "Tiếp tục với Google" (BR-010).
export function GoogleSignInButton({ label }: GoogleSignInButtonProps) {
  if (ENV.useMockApi) return <MockGoogleButton label={label} />;
  const config = resolveGoogleAuthConfig(Platform.OS);
  return config ? <ConfiguredGoogleButton label={label} config={config} /> : <UnconfiguredGoogleButton label={label} />;
}
