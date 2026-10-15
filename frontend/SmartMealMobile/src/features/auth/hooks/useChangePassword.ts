import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { ChangePasswordPayload } from '../types/auth.types';

/** Đổi mật khẩu khi đang đăng nhập (cần mật khẩu hiện tại); phiên hiện tại nhận token mới. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
}
