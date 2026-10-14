import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { ResetPasswordPayload } from '../types/auth.types';

/** Đặt mật khẩu mới bằng resetToken nhận được sau khi xác thực OTP. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
  });
}
