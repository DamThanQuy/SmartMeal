import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { DeleteAccountConfirmation } from '../types/auth.types';

/** Xóa vĩnh viễn tài khoản phía máy chủ (BR-271); việc dọn dữ liệu cục bộ và đăng xuất do màn hình làm khi thành công. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirmation: DeleteAccountConfirmation) => authService.deleteAccount(confirmation),
  });
}
