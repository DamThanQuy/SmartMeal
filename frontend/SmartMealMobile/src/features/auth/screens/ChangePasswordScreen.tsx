import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Lock } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { AUTH_RULES } from '@/constants/auth';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useChangePassword } from '../hooks/useChangePassword';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Nhập mật khẩu hiện tại' }),
    newPassword: z
      .string()
      .min(AUTH_RULES.PASSWORD_MIN_LENGTH, { message: `Tối thiểu ${AUTH_RULES.PASSWORD_MIN_LENGTH} ký tự` })
      .max(AUTH_RULES.PASSWORD_MAX_LENGTH, { message: `Tối đa ${AUTH_RULES.PASSWORD_MAX_LENGTH} ký tự` }),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })
  .refine(data => data.newPassword !== data.currentPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type Props = NativeStackScreenProps<MainStackParamList, 'ChangePassword'>;

// Settings → "Đổi mật khẩu" khi tài khoản đã có mật khẩu: xác nhận bằng mật khẩu hiện tại, không
// cần email OTP. BE đăng xuất mọi thiết bị khác và cấp token mới cho phiên này (giữ đăng nhập).
// Quên mật khẩu hiện tại thì đi luồng OTP như cũ ("Quên mật khẩu?").
export function ChangePasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const changePassword = useChangePassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(values => {
    changePassword.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  });

  if (changePassword.isSuccess) {
    return (
      <ScreenContainer scroll>
        <ScreenHeader title="Đổi mật khẩu" onBack={() => navigation.goBack()} />
        <View className="gap-xl py-md">
          <InlineBanner
            tone="success-outline"
            icon={<Check size={22} color={colors.primary} />}
            title="Đã đổi mật khẩu"
            description="Các thiết bị khác đã bị đăng xuất. Thiết bị này vẫn giữ đăng nhập."
          />
          <AppButton label="Xong" onPress={() => navigation.goBack()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Đổi mật khẩu" onBack={() => navigation.goBack()} />
      <View className="gap-xl py-md">
        <AppText variant="bodyLg" color="secondary">
          {`Mật khẩu mới tối thiểu ${AUTH_RULES.PASSWORD_MIN_LENGTH} ký tự. Sau khi đổi, các thiết bị khác sẽ bị đăng xuất.`}
        </AppText>

        <View className="gap-md">
          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Mật khẩu hiện tại"
                placeholder="Nhập mật khẩu hiện tại"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.currentPassword?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Mật khẩu mới"
                placeholder="Nhập mật khẩu mới"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.newPassword?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Nhập lại mật khẩu mới"
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>

        <View className="gap-sm">
          <AppButton label="Đổi mật khẩu" onPress={() => onSubmit()} loading={changePassword.isPending} />
          {changePassword.isError ? (
            <AppText variant="caption" color="error" className="text-center">
              {changePassword.error.message}
            </AppText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.FORGOT_PASSWORD, { returnTo: 'Settings' })}
            className="min-h-[44px] items-center justify-center"
          >
            <AppText variant="bodyMedium" color="onPrimarySoft">
              Quên mật khẩu hiện tại?
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
