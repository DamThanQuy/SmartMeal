import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { isGoogleSignInAvailable } from '../services/googleSignIn';
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
 * 1. Google Identity Services render nút chính thức vào AuthGoogleButton.
 * 2. Người dùng chọn tài khoản → Google trả ID token qua callback (`acceptCredential`).
 * 3. `authService.loginWithGoogle({ idToken })` → backend xác minh token, tạo/đăng nhập tài
 *    khoản SmartMeal, trả access + refresh token.
 * 4. `openSession(user)` nạp hồ sơ sức khỏe + quyết định có cần làm khảo sát không.
 * 5. `onSuccess({ user, needsSurvey })` để màn hình điều hướng.
 *
 * Trên native (Android/iOS) `isAvailable` = false và màn hình không hiện nút: cần
 * expo-auth-session + Dev Client mới làm được.
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

  const acceptCredential = useCallback(
    (idToken: string) => mutateGoogleLogin(idToken),
    [mutateGoogleLogin],
  );

  return {
    /** Có hiện đăng nhập Google không (Web + đã cấu hình Client ID). */
    isAvailable: isGoogleSignInAvailable(),
    /** Callback nhận ID token từ nút Google Identity Services được render trực tiếp. */
    acceptCredential,
    /** true khi đang gọi API /auth/google. */
    isLoading: googleMutation.isPending,
    /** Lỗi từ API — có thể hiển thị ở màn hình. */
    error: googleMutation.error,
    /** Kết quả (user + needsSurvey) sau khi openSession xong. */
    result: googleMutation.data,
  };
}
