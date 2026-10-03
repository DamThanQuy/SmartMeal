import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { openSession } from '../services/sessionService';
import type { GoogleLoginPayload, SessionOpenResult } from '../types/auth.types';

/**
 * Đăng nhập bằng Google ID token (lấy từ Google Sign-In/expo-auth-session — cần Dev Client và Client ID
 * cấu hình trên Google Cloud, không chạy được trong Expo Go). Giống useLogin: đăng nhập xong nạp luôn
 * hồ sơ sức khỏe rồi báo có cần làm khảo sát không.
 */
export function useGoogleLogin() {
  return useMutation({
    mutationFn: async (payload: GoogleLoginPayload): Promise<SessionOpenResult> => {
      const { user } = await authService.loginWithGoogle(payload);
      return openSession(user);
    },
  });
}
