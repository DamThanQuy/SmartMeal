import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { openSession } from '../services/sessionService';
import { getGoogleIdToken } from '../services/googleSignIn';
import type { SessionOpenResult } from '../types/auth.types';

export interface UseGoogleLoginOptions {
  /**
   * Gọi khi API /auth/google trả về thành công (kết quả của openSession:
   * user + needsSurvey). Màn hình dùng để điều hướng.
   */
  onSuccess?: (result: SessionOpenResult) => void;
}

/**
 * Hook Google Sign-In — chỉ hoạt động trên Web (Expo Web).
 *
 * Cách hoạt động:
 * 1. Người dùng bấm nút "Tiếp tục với Google" → gọi `start()`.
 * 2. `getGoogleIdToken()` load GSI script, initialize + prompt() → Google hiện
 *    nút/popup của chính Google. Người dùng chọn tài khoản → Google trả ID token.
 * 3. Gọi `authService.loginWithGoogle({ idToken })` → backend xác minh token,
 *    tạo/đăng nhập tài khoản SmartMeal, trả access+refresh token.
 * 4. `openSession(user)` nạp hồ sơ sức khỏe + quyết định cần làm khảo sát không.
 * 5. Gọi `onSuccess({ user, needsSurvey })` để màn hình điều hướng.
 *
 * Trên native (Android/iOS): hook log warning và return.
 * Native cần expo-auth-session + Dev Client (xem docs/SmartMeal_GoogleSignIn_Tasks.md).
 */
export function useGoogleLogin(options?: UseGoogleLoginOptions) {
  const onSuccessRef = useRef(options?.onSuccess);
  onSuccessRef.current = options?.onSuccess;

  const googleMutation = useMutation({
    mutationFn: async (idToken: string): Promise<SessionOpenResult> => {
      const { user } = await authService.loginWithGoogle({ idToken });
      return openSession(user);
    },
    onSuccess: (result: SessionOpenResult) => {
      onSuccessRef.current?.(result);
    },
  });

  const [isPrompting, setIsPrompting] = useState(false);

  /**
   * Bấm nút Google → mở Google prompt → nhận ID token → gọi API → openSession
   * → onSuccess callback. Màn hình dùng `start` làm `onPress` của AuthGoogleButton.
   */
  const start = useCallback(async () => {
    if (Platform.OS !== 'web') {
      console.warn(
        '[GoogleLogin] Google Sign-In chưa hoạt động trên native. ' +
          'Cần expo-auth-session + Dev Client. Xem docs/SmartMeal_GoogleSignIn_Tasks.md.',
      );
      return;
    }

    setIsPrompting(true);
    try {
      const idToken = await getGoogleIdToken();
      setIsPrompting(false);
      googleMutation.mutate(idToken);
    } catch (err) {
      setIsPrompting(false);
      if (err instanceof Error) {
        console.error('[GoogleLogin]', err);
      }
    }
  }, [googleMutation]);

  return {
    /** true khi đang chờ Google prompt. */
    isPrompting,
    /** Bấm nút Google trong App. */
    start,
    /** true khi đang gọi API /auth/google. */
    isLoading: googleMutation.isPending,
    /** Lỗi từ API — có thể hiển thị ở màn hình. */
    error: googleMutation.error,
    /** Kết quả (user + needsSurvey) sau khi openSession xong. */
    result: googleMutation.data,
  };
}
