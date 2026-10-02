import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Mail, TriangleAlert, User } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCheckbox, AppInput, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AuthGoogleButton } from '../components/AuthGoogleButton';
import { AuthSocialDivider } from '../components/AuthSocialDivider';
import { useRegister } from '../hooks/useRegister';

const registerSchema = z
  .object({
    fullName: z.string().min(2, { message: 'Vui lòng nhập họ tên' }),
    email: z.string().email({ message: 'Email không hợp lệ' }),
    password: z.string().min(8, { message: 'Tối thiểu 8 ký tự' }),
    confirmPassword: z.string(),
    agreeTerms: z.boolean(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })
  .refine(data => data.agreeTerms, {
    message: 'Bạn cần đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư',
    path: ['agreeTerms'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// design/Register.dc.html (BR-010, BR-011). Health Profile thu thập SAU khi tạo tài khoản
// (docs/design.md mục 39), nên submit thành công điều hướng sang Otp (mock) hoặc thẳng Health
// Profile (API thật — backend không có OTP).
export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const registerMutation = useRegister();
  const setPendingUser = useAuthStore(state => state.setPendingUser);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: true,
    },
  });

  const onSubmit = handleSubmit(values => {
    registerMutation.mutate(
      { fullName: values.fullName, email: values.email, password: values.password },
      {
        onSuccess: result => {
          setPendingUser(result.user);
          if (result.requiresOtp) {
            navigation.navigate(AUTH_ROUTES.OTP, {
              email: values.email,
              purpose: 'register',
            });
            return;
          }
          // Backend không có OTP: tài khoản đã tạo xong → vào thẳng Health Profile và bỏ Register
          // khỏi stack (quay lại sẽ chỉ báo "Email đã được sử dụng").
          navigation.reset({
            index: 0,
            routes: [{ name: AUTH_ROUTES.HEALTH_PROFILE_BASIC_INFO }],
          });
        },
      },
    );
  });

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Tạo tài khoản" onBack={() => navigation.goBack()} />
      <View className="gap-xl py-md">
        <AppText variant="bodyLg" color="secondary">
          Chỉ cần vài thông tin. Hồ sơ sức khỏe sẽ điền sau khi tạo tài khoản.
        </AppText>

        <View className="gap-md">
          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Họ tên"
                placeholder="Nguyễn Văn A"
                leftIcon={<User size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
              />
            )}
          />

          <View className="gap-xs">
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
            {registerMutation.isError ? (
              <View className="flex-row flex-wrap items-center gap-xs">
                <TriangleAlert size={14} color={colors.error} />
                <AppText variant="caption" color="error">
                  {registerMutation.error.message}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đăng nhập"
                  className="min-h-[44px] justify-center"
                  onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
                >
                  <AppText variant="caption" color="onPrimarySoft">
                    Đăng nhập?
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Mật khẩu"
                placeholder="Tối thiểu 8 ký tự"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                label="Nhập lại mật khẩu"
                placeholder="Nhập lại mật khẩu"
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

        <View>
          <Controller
            control={control}
            name="agreeTerms"
            render={({ field: { value, onChange } }) => (
              <AppCheckbox
                checked={value}
                onChange={onChange}
                label="Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư"
              />
            )}
          />
          {errors.agreeTerms ? (
            <AppText variant="caption" color="error">
              {errors.agreeTerms.message}
            </AppText>
          ) : null}
        </View>

        <View className="gap-md">
          <AppButton
            label="Đăng ký"
            onPress={() => onSubmit()}
            loading={registerMutation.isPending}
          />
          <AuthSocialDivider />
          <AuthGoogleButton label="Đăng ký với Google" onPress={() => {}} />
        </View>

        <View className="flex-row items-center justify-center gap-xs">
          <AppText variant="body" color="secondary">
            Đã có tài khoản?
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng nhập"
            className="min-h-[44px] items-center justify-center"
            onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
          >
            <AppText variant="bodyMedium" color="onPrimarySoft">
              Đăng nhập
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
