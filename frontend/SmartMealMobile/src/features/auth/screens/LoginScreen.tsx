import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, Pressable, View } from 'react-native';
import { z } from 'zod';
import { ScreenContainer } from '@/components/common';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { isApiError } from '@/services/api';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AuthGoogleButton } from '../components/AuthGoogleButton';
import { AuthSocialDivider } from '../components/AuthSocialDivider';
import { useGoogleLogin } from '../hooks/useGoogleLogin';
import { useLogin } from '../hooks/useLogin';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(8, { message: 'Mật khẩu tối thiểu 8 ký tự' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/** Mã lỗi BE khi đăng nhập đúng mật khẩu nhưng email chưa xác minh (đã gửi mã OTP mới). */
const EMAIL_NOT_VERIFIED = 'email_not_verified';

// design/Main.dc.html (BR-013, BR-014). Mock (EXPO_PUBLIC_USE_MOCK_API=true): đăng nhập không
// kiểm tra thật — mọi email/mật khẩu hợp lệ định dạng đều thành công, trừ khi Dev bật
// MOCK_SCENARIO='error'. API thật: POST /auth/login rồi nạp hồ sơ sức khỏe (useLogin).
export function LoginScreen({ navigation, route }: Props) {
  const verifiedEmail = route.params?.verifiedEmail;
  const { colors } = useTheme();
  const login = useAuthStore(state => state.login);
  const setPendingUser = useAuthStore(state => state.setPendingUser);
  const continueAsGuest = useAuthStore(state => state.continueAsGuest);
  const loginMutation = useLogin();
  const handleSessionOpen = ({ user, needsSurvey }: { user: import('@/state/auth/authStore').AuthUser; needsSurvey: boolean }) => {
    if (!needsSurvey) {
      login(user);
      return;
    }
    setPendingUser(user);
    navigation.reset({ index: 0, routes: [{ name: AUTH_ROUTES.HEALTH_PROFILE_BASIC_INFO }] });
  };
  const googleLogin = useGoogleLogin({ onSuccess: handleSessionOpen });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // Không điền sẵn tài khoản dùng thử: tài khoản đó có hồ sơ sức khỏe mẫu và gói Pro không qua thanh toán,
    // nên số liệu sẽ không phải của người dùng. Đăng ký/đăng nhập bằng tài khoản thật.
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(values => {
    loginMutation.mutate(values, {
      onSuccess: ({ user, needsSurvey }) => {
        if (!needsSurvey) {
          login(user);
          return;
        }
        // Tài khoản chưa làm Health Profile (vd. thoát app giữa chừng khi đăng ký): chưa vào Main,
        // đi thẳng wizard và bỏ Login khỏi stack vì đã có phiên.
        setPendingUser(user);
        navigation.reset({
          index: 0,
          routes: [{ name: AUTH_ROUTES.HEALTH_PROFILE_BASIC_INFO }],
        });
      },
      onError: error => {
        // Mật khẩu đúng nhưng email chưa xác minh: server vừa gửi mã → sang màn nhập mã, xong quay lại đây.
        if (isApiError(error) && error.details.includes(EMAIL_NOT_VERIFIED)) {
          loginMutation.reset();
          navigation.navigate(AUTH_ROUTES.OTP, {
            email: values.email.trim(),
            purpose: 'register',
            returnTo: 'Login',
          });
        }
      },
    });
  });

  return (
    <ScreenContainer scroll contentContainerClassName="gap-xxl py-xxxl">
      <View className="items-start">
        <Image
          source={require('../../../../assets/images/SmartMeal_Logo.png')}
          style={{ width: 220, height: 60 }}
          resizeMode="contain"
        />
      </View>

      <View className="gap-xs">
        <AppText variant="h1">Chào mừng trở lại</AppText>
        <AppText variant="bodyLg" color="secondary">
          Đăng nhập để tiếp tục theo dõi dinh dưỡng của bạn.
        </AppText>
      </View>

      <View className="gap-md">
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

        <View className="gap-xs">
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyMedium" color="secondary">
              Mật khẩu
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quên mật khẩu?"
              className="min-h-[44px] items-center justify-center"
              onPress={() => navigation.navigate(AUTH_ROUTES.FORGOT_PASSWORD)}
            >
              <AppText variant="bodyMedium" color="onPrimarySoft">
                Quên mật khẩu?
              </AppText>
            </Pressable>
          </View>
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                placeholder="Nhập mật khẩu"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textSecondary} />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />
        </View>
      </View>

      <View className="gap-md">
        <AppButton
          label="Đăng nhập"
          onPress={() => onSubmit()}
          loading={loginMutation.isPending}
        />
        {loginMutation.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {loginMutation.error.message}
          </AppText>
        ) : verifiedEmail ? (
          <AppText variant="caption" color="secondary" className="text-center">
            Email đã được xác minh. Hãy đăng nhập lại.
          </AppText>
        ) : null}
        <AuthSocialDivider />
        <AuthGoogleButton
          label="Tiếp tục với Google"
          onPress={googleLogin.start}
          onCredential={googleLogin.acceptCredential}
          disabled={googleLogin.isLoading || googleLogin.isPrompting}
        />
        {googleLogin.error ? <AppText variant="caption" color="error" className="text-center">{googleLogin.error.message}</AppText> : null}
      </View>

      <View className="items-center gap-sm">
        <View className="flex-row items-center gap-xs">
          <AppText variant="body" color="secondary">
            Chưa có tài khoản?
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng ký"
            className="min-h-[44px] items-center justify-center"
            onPress={() => navigation.navigate(AUTH_ROUTES.REGISTER)}
          >
            <AppText variant="bodyMedium" color="onPrimarySoft">
              Đăng ký
            </AppText>
          </Pressable>
        </View>
        {/* isGuest=true → AppNavigator render Main, MainTabNavigator tự chọn tab Khám phá
            (Đợt 9 — design v2 Welcome/Main.dc.html, BR §2.1). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khám phá công thức không cần đăng nhập"
          className="min-h-[44px] flex-row items-center gap-xs"
          onPress={() => continueAsGuest()}
        >
          <AppText variant="bodyMedium" color="onPrimarySoft">
            Khám phá công thức không cần đăng nhập
          </AppText>
          <ArrowRight size={16} color={colors.onPrimarySoft} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
