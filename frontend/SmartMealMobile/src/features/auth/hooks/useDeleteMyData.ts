import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';

/** Xóa dữ liệu cá nhân của người dùng phía máy chủ (BR-271); việc dọn dữ liệu cục bộ do màn hình làm khi thành công. */
export function useDeleteMyData() {
  return useMutation({
    mutationFn: () => authService.deleteMyData(),
  });
}
