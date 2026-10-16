import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { isGoogleSignInSupported, loadNativeGoogleSignIn } from '../services/nativeGoogleSignIn';
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
 * Hook Google Sign-In hỗ trợ đa nền tảng:
 * - Native (Android / iOS): Sử dụng Google Play Services chính thức (@react-native-google-signin/google-signin) —
 *   chỉ trên dev build / bản chính thức; thư viện được nạp khi cần (nativeGoogleSignIn.ts) nên Expo Go vẫn chạy được,
 *   chỉ không có đăng nhập Google (`isAvailable = false`, màn hình ẩn nút).
 * - Web: Nhận token trực tiếp qua acceptCredential
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

  const [isPrompting, setIsPrompting] = useState(false);
  const [promptError, setPromptError] = useState<Error | null>(null);

  const start = useCallback(async () => {
    try {
      setIsPrompting(true);
      setPromptError(null);

      if (Platform.OS === 'web') {
        // Trên web, Google Identity Services gọi qua acceptCredential
        return;
      }

      const nativeGoogle = loadNativeGoogleSignIn();
      if (!nativeGoogle) {
        setPromptError(new Error('Đăng nhập Google cần bản dev build của app (Expo Go không hỗ trợ).'));
        return;
      }
      const { GoogleSignin } = nativeGoogle;

      // Kiểm tra Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Thực hiện đăng nhập Google
      const signInResult: any = await GoogleSignin.signIn();
      console.log('[GoogleSignin] Result:', JSON.stringify(signInResult));
      const idToken = signInResult.data?.idToken || signInResult.idToken;

      if (!idToken) {
        console.warn('[GoogleSignin] Missing idToken:', JSON.stringify(signInResult));
        throw new Error('Không lấy được ID token: ' + JSON.stringify(signInResult));
      }

      googleMutation.mutate(idToken);
    } catch (err: any) {
      const statusCodes = loadNativeGoogleSignIn()?.statusCodes;
      if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Người dùng hủy popup chọn tài khoản
      } else if (statusCodes && err.code === statusCodes.IN_PROGRESS) {
        // Đang xử lý
      } else if (statusCodes && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setPromptError(new Error('Google Play Services không khả dụng hoặc cần cập nhật.'));
      } else {
        setPromptError(err);
      }
    } finally {
      setIsPrompting(false);
    }
  }, [googleMutation]);

  const acceptCredential = useCallback((idToken: string) => {
    setPromptError(null);
    setIsPrompting(false);
    googleMutation.mutate(idToken);
  }, [googleMutation]);

  return {
    /** false khi chạy trên Expo Go (không có Google Sign-In native) — màn hình ẩn nút Google. */
    isAvailable: isGoogleSignInSupported,
    /** true khi đang chờ Google prompt hoặc đang gọi API. */
    isPrompting: isPrompting || googleMutation.isPending,
    /** Bấm nút Google trong App để kích hoạt One-Tap / Account Chooser. */
    start,
    /** Callback nhận ID token từ nút Google Identity Services (Web). */
    acceptCredential,
    /** true khi đang gọi API /auth/google. */
    isLoading: googleMutation.isPending,
    /** Lỗi từ API hoặc quá trình prompt. */
    error: promptError ?? googleMutation.error,
    /** Kết quả (user + needsSurvey) sau khi openSession xong. */
    result: googleMutation.data,
  };
}
