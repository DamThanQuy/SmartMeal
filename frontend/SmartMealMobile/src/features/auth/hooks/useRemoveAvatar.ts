import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/state/auth/authStore';
import { authService } from '../services/authService';

/** Xóa ảnh đại diện; thành công thì user trong authStore quay về chữ cái đầu của tên. */
export function useRemoveAvatar() {
  const updateUser = useAuthStore(state => state.updateUser);
  return useMutation({
    mutationFn: () => authService.removeAvatar(),
    onSuccess: ({ avatarUrl }) => updateUser({ avatarUrl }),
  });
}
