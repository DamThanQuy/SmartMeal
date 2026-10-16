import { useState } from 'react';
import { AUTH_RULES } from '@/constants/auth';
import { useRemoveAvatar, useUploadAvatar } from '@/features/auth';
import {
  CameraPermissionDeniedError,
  pickAvatar,
  takeAvatarPhoto,
  type PickedAvatar,
} from '../services/avatarPickerService';

export type AvatarSource = 'camera' | 'library';

/**
 * Đổi ảnh đại diện (chụp mới hoặc chọn từ thư viện → POST /auth/avatar) hoặc xóa ảnh (DELETE
 * /auth/avatar). Dùng chung cho ProfileScreen và EditProfileScreen; thành công thì authStore cập nhật
 * nên mọi UserAvatar đổi theo.
 */
export function useChangeAvatar() {
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const [pickError, setPickError] = useState<string | null>(null);

  const clearErrors = () => {
    setPickError(null);
    uploadAvatar.reset();
    removeAvatar.reset();
  };

  const changeFrom = async (source: AvatarSource) => {
    clearErrors();
    let picked: PickedAvatar | undefined;
    try {
      picked = source === 'camera' ? await takeAvatarPhoto() : await pickAvatar();
    } catch (error) {
      setPickError(
        error instanceof CameraPermissionDeniedError
          ? error.message
          : source === 'camera'
            ? 'Không mở được camera.'
            : 'Không mở được thư viện ảnh.',
      );
      return;
    }
    if (!picked) return;

    if (picked.fileSize !== undefined && picked.fileSize > AUTH_RULES.AVATAR_MAX_BYTES) {
      setPickError(`Ảnh quá lớn, tối đa ${AUTH_RULES.AVATAR_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    uploadAvatar.mutate({ uri: picked.uri, mimeType: picked.mimeType, fileName: picked.fileName });
  };

  const remove = () => {
    clearErrors();
    removeAvatar.mutate();
  };

  return {
    changeFrom,
    remove,
    isPending: uploadAvatar.isPending || removeAvatar.isPending,
    error: pickError ?? uploadAvatar.error?.message ?? removeAvatar.error?.message ?? null,
  };
}
