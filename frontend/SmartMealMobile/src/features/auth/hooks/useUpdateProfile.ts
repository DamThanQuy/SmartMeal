import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/state/auth/authStore';
import { authService } from '../services/authService';
import type { UpdateProfilePayload } from '../types/auth.types';

/** Đổi họ tên tài khoản; thành công thì cập nhật luôn user trong authStore. */
export function useUpdateProfile() {
  const updateUser = useAuthStore(state => state.updateUser);
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authService.updateProfile(payload),
    onSuccess: ({ fullName }) => updateUser({ fullName }),
  });
}
