import { useMutation } from '@tanstack/react-query';
import { useUpdateProfile } from '@/features/auth';
import { useUpdateBasicInfo, type BasicInfoUpdate } from '@/features/health';

export interface EditProfileInput {
  /** Họ tên mới — chỉ gửi khi đã đổi (PUT /auth/profile). */
  fullName?: string;
  /** Giới tính/ngày sinh/chiều cao mới — chỉ gửi khi đã đổi (tính lại BMI/BMR/TDEE/macro). */
  basicInfo?: BasicInfoUpdate;
}

/**
 * EditProfileScreen lưu 2 nơi khác nhau ở backend: tài khoản (họ tên) và hồ sơ sức khỏe (giới
 * tính/ngày sinh/chiều cao). Chạy tuần tự và dừng ở bước lỗi; bước đã xong đã được ghi vào store
 * nên màn hình chỉ cần gửi lại phần còn khác khi người dùng bấm "Lưu" lần nữa.
 */
export function useEditProfile() {
  const updateProfile = useUpdateProfile();
  const updateBasicInfo = useUpdateBasicInfo();

  return useMutation({
    mutationFn: async ({ fullName, basicInfo }: EditProfileInput) => {
      if (fullName !== undefined) await updateProfile.mutateAsync({ fullName });
      if (basicInfo !== undefined) await updateBasicInfo.mutateAsync(basicInfo);
    },
  });
}
