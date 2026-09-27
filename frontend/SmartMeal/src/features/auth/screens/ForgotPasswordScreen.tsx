import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useForgotPassword } from '../hooks/useForgotPassword';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

// design/ForgotPassword.dc.html. Không thuộc BR đã đánh số — vì mock đăng nhập không kiểm
// tra mật khẩu thật (CLAUDE.md mục 8), sau khi xác thực OTP chỉ cần quay lại Login, không cần
// màn "đặt mật khẩu mới" riêng (không có artboard cho bước đó).
export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
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
          navigation.navigate(AUTH_ROUTES.OTP, {
            email: values.email,
            purpose: 'reset-password',
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
            title="Đã gửi mã tới email của bạn"
            description="Mã có hiệu lực trong 10 phút."
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại đăng nhập"
          className="min-h-[44px] items-center justify-center"
          onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
        >
          <AppText variant="bodyMedium" color="onPrimarySoft">
            Quay lại đăng nhập
          </AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
