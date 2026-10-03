import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, CircleUser, Info } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppChip, AppInput, AppText } from '@/components/ui';
import { GENDER_OPTIONS } from '@/features/health';
import type { MainStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useEditProfile } from '../hooks/useEditProfile';

type Props = NativeStackScreenProps<MainStackParamList, 'EditProfile'>;

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE = 13;
const MAX_AGE = 100;
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

const editProfileSchema = z.object({
  fullName: z.string().trim().min(1, { message: 'Bắt buộc' }),
  birthYear: z
    .string()
    .min(4, { message: 'Bắt buộc' })
    .refine(
      value => {
        const age = CURRENT_YEAR - Number(value);
        return age >= MIN_AGE && age <= MAX_AGE;
      },
      { message: `Tuổi phải từ ${MIN_AGE} đến ${MAX_AGE}` },
    ),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z
    .string()
    .min(1, { message: 'Bắt buộc' })
    .refine(
      value => {
        const height = Number(value);
        return height >= MIN_HEIGHT_CM && height <= MAX_HEIGHT_CM;
      },
      { message: `Chiều cao phải từ ${MIN_HEIGHT_CM} đến ${MAX_HEIGHT_CM}cm` },
    ),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

// design/EditProfile.dc.html (design v2, Đợt 9, BR-003). Đổi avatar chỉ UI + nút giả lập, chưa
// gọi expo-image-picker thật (CLAUDE.md mục 9; backend cũng chưa có upload ảnh). Email chỉ đọc
// (BR-011 — email gắn 1 tài khoản). Họ tên lưu ở tài khoản, giới tính/năm sinh/chiều cao lưu ở hồ
// sơ sức khỏe (backend chỉ lưu tuổi nên năm sinh là ước lượng) — xem useEditProfile.
export function EditProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const user = useAuthStore(state => state.user);
  const profile = useUserProfileStore();
  const editProfile = useEditProfile();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      birthYear: String(profile.dateOfBirth.getFullYear()),
      gender: profile.gender,
      heightCm: String(profile.heightCm),
    },
  });

  const gender = watch('gender');

  const onSubmit = handleSubmit(values => {
    const fullName = values.fullName.trim();
    const dateOfBirth = new Date(
      Number(values.birthYear),
      profile.dateOfBirth.getMonth(),
      profile.dateOfBirth.getDate(),
    );
    const heightCm = Number(values.heightCm);

    // Chỉ gửi phần đã đổi: mỗi lần sửa hồ sơ sức khỏe backend thêm 1 dòng cân nặng, và nếu lần
    // trước đã lưu xong họ tên thì không lưu lại.
    const nameChanged = fullName !== (user?.fullName ?? '');
    const basicInfoChanged =
      values.gender !== profile.gender ||
      dateOfBirth.getTime() !== profile.dateOfBirth.getTime() ||
      heightCm !== profile.heightCm;
    if (!nameChanged && !basicInfoChanged) {
      navigation.goBack();
      return;
    }

    editProfile.mutate(
      {
        fullName: nameChanged ? fullName : undefined,
        basicInfo: basicInfoChanged ? { gender: values.gender, dateOfBirth, heightCm } : undefined,
      },
      { onSuccess: () => navigation.goBack() },
    );
  });

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Chỉnh sửa hồ sơ" onBack={() => navigation.goBack()} />
      <View className="gap-xl py-sm">
        <View className="items-center gap-sm">
          <View className="relative h-[96px] w-[96px]">
            <View className="h-[96px] w-[96px] items-center justify-center rounded-full bg-primary-soft">
              <AppText variant="display" color="onPrimarySoft">
                {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đổi ảnh đại diện"
              onPress={() => {}}
              className="absolute bottom-[-6px] right-[-6px] h-[44px] w-[44px] items-center justify-center rounded-full border-[3px] border-background bg-primary"
            >
              <Camera size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
            onPress={() => {}}
            className="min-h-[44px] items-center justify-center"
          >
            <AppText variant="bodyMedium" color="onPrimarySoft">
              Đổi ảnh đại diện
            </AppText>
          </Pressable>
        </View>

        <View className="gap-md">
          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Họ tên"
                placeholder="Nhập họ tên"
                leftIcon={<CircleUser size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
              />
            )}
          />

          <AppInput
            label="Email"
            value={user?.email ?? ''}
            editable={false}
            className="bg-surface-subtle text-text-secondary"
          />
          <AppText variant="caption" color="secondary" className="-mt-sm">
            Email không thể thay đổi
          </AppText>

          <Controller
            control={control}
            name="birthYear"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Năm sinh"
                placeholder="VD: 2003"
                keyboardType="number-pad"
                maxLength={4}
                value={value}
                onChangeText={onChange}
                error={errors.birthYear?.message}
              />
            )}
          />

          <View className="gap-sm">
            <AppText variant="bodyMedium" color="secondary">
              Giới tính
            </AppText>
            <View className="flex-row flex-wrap gap-sm">
              {GENDER_OPTIONS.map(option => (
                <AppChip
                  key={option.id}
                  label={option.label}
                  selected={gender === option.id}
                  onPress={() => setValue('gender', option.id, { shouldValidate: true })}
                />
              ))}
            </View>
          </View>

          <Controller
            control={control}
            name="heightCm"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Chiều cao"
                placeholder="0"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    cm
                  </AppText>
                }
                error={errors.heightCm?.message}
              />
            )}
          />
        </View>

        <InlineBanner
          icon={<Info size={20} color={colors.info} />}
          description="Đổi chiều cao hoặc năm sinh sẽ tự tính lại BMI, TDEE và mục tiêu calo mỗi ngày. Cân nặng cập nhật trong mục Cân nặng."
        />

        {editProfile.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {editProfile.error.message}
          </AppText>
        ) : null}

        <View className="flex-row gap-sm">
          <AppButton
            label="Hủy"
            variant="outline"
            className="flex-1"
            onPress={() => navigation.goBack()}
          />
          <AppButton
            label="Lưu thay đổi"
            className="flex-1"
            loading={editProfile.isPending}
            onPress={() => onSubmit()}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
