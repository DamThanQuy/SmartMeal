import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/state/auth/authStore';
import { authService } from '../services/authService';
import type { UploadAvatarPayload } from '../types/auth.types';

/** Tải ảnh đại diện đã chọn lên; thành công thì cập nhật luôn user trong authStore. */
export function useUploadAvatar() {
  const updateUser = useAuthStore(state => state.updateUser);
  return useMutation({
    mutationFn: (payload: UploadAvatarPayload) => authService.uploadAvatar(payload),
    onSuccess: ({ avatarUrl }) => updateUser({ avatarUrl }),
  });
}
