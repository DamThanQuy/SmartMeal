import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { openSession } from '../services/sessionService';
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
 * Cách hoạt động trên Web:
 * 1. Google Identity Services render nút chính thức vào AuthGoogleButton.
 * 2. Người dùng chọn tài khoản → Google trả ID token qua callback.
 * 3. Gọi `authService.loginWithGoogle({ idToken })` → backend xác minh token,
 *    tạo/đăng nhập tài khoản SmartMeal, trả access+refresh token.
 * 4. `openSession(user)` nạp hồ sơ sức khỏe + quyết định cần làm khảo sát không.
 * 5. Gọi `onSuccess({ user, needsSurvey })` để màn hình điều hướng.
 *
 * Trên native (Android/iOS): hook log warning và return.
 * Native cần expo-auth-session + Dev Client (xem docs/SmartMeal_GoogleSignIn_Tasks.md).
 */
export function useGoogleLogin(options?: UseGoogleLoginOptions) {
  const googleMutation = useMutation({
    mutationFn: async (idToken: string): Promise<SessionOpenResult> => {
      const { user } = await authService.loginWithGoogle({ idToken });
      return openSession(user);
    },
    onSuccess: (result: SessionOpenResult) => {
      options?.onSuccess?.(result);
    },
  });
  const mutateGoogleLogin = googleMutation.mutate;

  const [isPrompting, setIsPrompting] = useState(false);
  const [promptError, setPromptError] = useState<Error | null>(null);

  /**
   * Fallback cho native; Web dùng nút Google Identity Services render trực tiếp.
   */
  const start = useCallback(async () => {
    if (Platform.OS !== 'web') {
      console.warn(
        '[GoogleLogin] Google Sign-In chưa hoạt động trên native. ' +
          'Cần expo-auth-session + Dev Client. Xem docs/SmartMeal_GoogleSignIn_Tasks.md.',
      );
      return;
    }

  }, []);

  const acceptCredential = useCallback((idToken: string) => {
    setPromptError(null);
    setIsPrompting(false);
    mutateGoogleLogin(idToken);
  }, [mutateGoogleLogin]);

  return {
    /** true khi đang chờ Google prompt. */
    isPrompting,
    /** Bấm nút Google trong App. */
    start,
    /** Callback nhận ID token từ nút Google Identity Services được render trực tiếp. */
    acceptCredential,
    /** true khi đang gọi API /auth/google. */
    isLoading: googleMutation.isPending,
    /** Lỗi từ API — có thể hiển thị ở màn hình. */
    error: promptError ?? googleMutation.error,
    /** Kết quả (user + needsSurvey) sau khi openSession xong. */
    result: googleMutation.data,
  };
}
