import { zodResolver } from '@hookform/resolvers/zod';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Check, Lock } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { AUTH_RULES } from '@/constants/auth';
import { AUTH_ROUTES } from '@/constants/routes';
import type { ForgotPasswordReturnTo } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useResetPassword } from '../hooks/useResetPassword';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(AUTH_RULES.PASSWORD_MIN_LENGTH, { message: `Tối thiểu ${AUTH_RULES.PASSWORD_MIN_LENGTH} ký tự` })
      .max(AUTH_RULES.PASSWORD_MAX_LENGTH, { message: `Tối đa ${AUTH_RULES.PASSWORD_MAX_LENGTH} ký tự` }),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// Đăng ký ở cả AuthNavigator (quên mật khẩu trước đăng nhập) và MainNavigator (Settings → "Đổi
// mật khẩu") như ForgotPasswordScreen/OtpScreen nên navigation prop không gắn cứng vào 1 ParamList.
interface ResetPasswordScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route: { params: { email: string; resetToken: string; returnTo?: ForgotPasswordReturnTo } };
}

// Bước cuối của luồng quên/đổi mật khẩu: OTP đúng → backend cấp resetToken dùng một lần → màn này
// gửi mật khẩu mới. Backend thu hồi mọi phiên đăng nhập của tài khoản sau khi đặt lại, nên dù mở từ
// Login hay từ Settings (đang đăng nhập) người dùng đều phải đăng nhập lại bằng mật khẩu mới.
export function ResetPasswordScreen({ navigation, route }: ResetPasswordScreenProps) {
  const { email, resetToken, returnTo } = route.params;
  const { colors } = useTheme();
  const logout = useAuthStore(state => state.logout);
  const resetPassword = useResetPassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(values => {
    resetPassword.mutate({ email, resetToken, newPassword: values.newPassword });
  });

  const goToLogin = () => {
    // Đang đăng nhập (mở từ Settings): kết thúc phiên cũ rồi AuthNavigator mở thẳng Login. Chưa
    // đăng nhập: bỏ cả chuỗi quên mật khẩu khỏi stack, chỉ còn Login.
    if (returnTo === 'Settings') {
      logout('expired');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: AUTH_ROUTES.LOGIN }] });
  };

  if (resetPassword.isSuccess) {
    return (
      <ScreenContainer scroll>
        <ScreenHeader title="Mật khẩu mới" />
        <View className="gap-xl py-md">
          <InlineBanner
            tone="success-outline"
            icon={<Check size={22} color={colors.primary} />}
            title="Đã đặt lại mật khẩu"
            description="Vì an toàn, mọi thiết bị đang đăng nhập đã bị đăng xuất. Hãy đăng nhập lại bằng mật khẩu mới."
          />
          <AppButton label="Đăng nhập" onPress={goToLogin} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Mật khẩu mới" onBack={() => navigation.goBack()} />
      <View className="gap-xl py-md">
        <View className="gap-xs">
          <AppText variant="h1">Tạo mật khẩu mới</AppText>
          <AppText variant="bodyLg" color="secondary">
            {`Mật khẩu cho ${email}, tối thiểu ${AUTH_RULES.PASSWORD_MIN_LENGTH} ký tự.`}
          </AppText>
        </View>

        <View className="gap-md">
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
                label="Nhập lại mật khẩu"
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
          <AppButton
            label="Đặt lại mật khẩu"
            onPress={() => onSubmit()}
            loading={resetPassword.isPending}
          />
          {resetPassword.isError ? (
            <AppText variant="caption" color="error" className="text-center">
              {resetPassword.error.message}
            </AppText>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}
