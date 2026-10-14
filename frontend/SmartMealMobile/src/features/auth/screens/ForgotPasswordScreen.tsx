import { zodResolver } from '@hookform/resolvers/zod';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Check, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { AUTH_RULES } from '@/constants/auth';
import { AUTH_ROUTES, MAIN_STACK_ROUTES } from '@/constants/routes';
import type { ForgotPasswordReturnTo } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useForgotPassword } from '../hooks/useForgotPassword';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Màn này được đăng ký ở cả AuthNavigator (AuthStackParamList) và MainNavigator
// (MainStackParamList, SettingsScreen "Đổi mật khẩu" — sửa lệch sau Đợt 9) nên không gắn cứng
// navigation prop vào 1 trong 2 ParamList — dùng NavigationProp<ParamListBase> (đủ cho .navigate/
// .goBack, không phải `any`), route.params đọc qua interface riêng bên dưới.
interface ForgotPasswordScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route: { params?: { returnTo?: ForgotPasswordReturnTo } };
}

// design/ForgotPassword.dc.html. Không thuộc BR đã đánh số. Luồng: email → mã OTP (OtpScreen) → mật
// khẩu mới (ResetPasswordScreen, không có artboard riêng). route.params.returnTo cho biết mở từ
// Login hay từ Settings. Backend luôn trả thành công dù email có đăng ký hay không (không lộ tài
// khoản) nên thông báo ở đây không khẳng định email tồn tại.
export function ForgotPasswordScreen({ navigation, route }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const returnTo = route.params?.returnTo ?? 'Login';
  const [justSent, setJustSent] = useState(false);
  const forgotPassword = useForgotPassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(values => {
    forgotPassword.mutate(values, {
      onSuccess: () => {
        setJustSent(true);
        setTimeout(() => {
          navigation.navigate(returnTo === 'Settings' ? MAIN_STACK_ROUTES.OTP : AUTH_ROUTES.OTP, {
            email: values.email,
            purpose: 'reset-password',
            returnTo,
          });
        }, 700);
      },
    });
  });

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Quên mật khẩu" onBack={() => navigation.goBack()} />
      <View className="gap-xl py-md">
        <View className="gap-xs">
          <AppText variant="h1">Đặt lại mật khẩu</AppText>
          <AppText variant="bodyLg" color="secondary">
            Nhập email đã đăng ký, SmartMeal sẽ gửi mã để bạn tạo mật khẩu mới.
          </AppText>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <AppInput
              label="Email"
              placeholder="ban@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={colors.textSecondary} />}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        <View className="gap-sm">
          <AppButton
            label="Gửi mã đặt lại"
            onPress={() => onSubmit()}
            loading={forgotPassword.isPending}
          />
          {forgotPassword.isError ? (
            <AppText variant="caption" color="error" className="text-center">
              {forgotPassword.error.message}
            </AppText>
          ) : null}
        </View>

        {justSent ? (
          <InlineBanner
            tone="success-outline"
            icon={<Check size={22} color={colors.primary} />}
            title="Nếu email đã đăng ký, mã đã được gửi"
            description={`Mã có hiệu lực trong ${AUTH_RULES.OTP_VALIDITY_MINUTES} phút.`}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={returnTo === 'Settings' ? 'Quay lại Cài đặt' : 'Quay lại đăng nhập'}
          className="min-h-[44px] items-center justify-center"
          onPress={() =>
            returnTo === 'Settings' ? navigation.goBack() : navigation.navigate(AUTH_ROUTES.LOGIN)
          }
        >
          <AppText variant="bodyMedium" color="onPrimarySoft">
            {returnTo === 'Settings' ? 'Quay lại Cài đặt' : 'Quay lại đăng nhập'}
          </AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
