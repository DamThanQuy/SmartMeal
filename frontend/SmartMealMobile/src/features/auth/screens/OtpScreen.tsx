import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Info, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { AUTH_ROUTES, MAIN_STACK_ROUTES } from '@/constants/routes';
import type { ForgotPasswordReturnTo, OtpPurpose } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { useResendOtp, useVerifyOtp } from '../hooks/useOtp';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Đăng ký ở cả AuthNavigator và MainNavigator (SettingsScreen "Đổi mật khẩu" — sửa lệch sau Đợt
// 9, xem ForgotPasswordScreen.tsx) nên navigation prop không gắn cứng vào 1 ParamList — cùng cách
// làm với ForgotPasswordScreen.tsx.
interface OtpScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route: { params: { email: string; purpose: OtpPurpose; returnTo?: ForgotPasswordReturnTo } };
}

// design/OTP.dc.html. Dùng chung cho 2 luồng theo BR-010 (xác thực đăng ký) và luồng quên
// mật khẩu (chưa có mã BR riêng) — phân biệt qua route.params.purpose.
export function OtpScreen({ navigation, route }: OtpScreenProps) {
  const { email, purpose, returnTo } = route.params;
  const { colors } = useTheme();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft(current => Math.max(current - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH;

  const handleConfirm = () => {
    verifyOtp.mutate(
      { email, code },
      {
        onSuccess: () => {
          if (purpose === 'register') {
            navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_BASIC_INFO);
          } else if (returnTo === 'Settings') {
            // Đổi mật khẩu từ Settings (đã đăng nhập) — quay lại Settings thay vì Login.
            navigation.navigate(MAIN_STACK_ROUTES.SETTINGS);
          } else {
            navigation.navigate(AUTH_ROUTES.LOGIN);
          }
        },
      },
    );
  };

  const handleResend = () => {
    resendOtp.mutate(email, {
      onSuccess: () => setSecondsLeft(RESEND_COOLDOWN_SECONDS),
    });
  };

  return (
    <ScreenContainer scroll>
      <ScreenHeader
        title={purpose === 'register' ? 'Xác thực email' : 'Đặt lại mật khẩu'}
        onBack={() => navigation.goBack()}
      />
      <View className="gap-xl py-md">
        <View className="items-center gap-md">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-pill bg-primary-soft">
            <Mail size={34} color={colors.primary} />
          </View>
          <View className="items-center gap-xs">
            <AppText variant="h1">Nhập mã xác thực</AppText>
            <AppText variant="body" color="secondary" className="text-center">
              {'Mã gồm 6 số đã được gửi tới\n'}
              <AppText variant="bodyMedium">{maskEmail(email)}</AppText>
            </AppText>
          </View>
        </View>

        <View className="gap-lg">
          <OtpCodeInput value={digits} onChange={setDigits} />

          <View className="items-center">
            {secondsLeft > 0 ? (
              <AppText variant="body" color="secondary">
                {'Gửi lại mã sau '}
                <AppText variant="bodyMedium">{formatCountdown(secondsLeft)}</AppText>
              </AppText>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gửi lại mã"
                className="min-h-[44px] items-center justify-center"
                onPress={handleResend}
                disabled={resendOtp.isPending}
              >
                <AppText variant="bodyMedium" color="onPrimarySoft">
                  {resendOtp.isPending ? 'Đang gửi lại...' : 'Gửi lại mã'}
                </AppText>
              </Pressable>
            )}
          </View>

          <InlineBanner
            icon={<Info size={20} color={colors.info} />}
            description="Tài khoản chỉ được kích hoạt sau khi xác thực. Kiểm tra cả hộp thư Spam nếu chưa thấy mã."
          />

          {verifyOtp.isError ? (
            <AppText variant="caption" color="error" className="text-center">
              {verifyOtp.error.message}
            </AppText>
          ) : null}
        </View>

        <View className="gap-sm">
          <AppButton
            label="Xác nhận"
            onPress={handleConfirm}
            loading={verifyOtp.isPending}
            disabled={!isComplete}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi email"
            className="min-h-[44px] items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <AppText variant="bodyMedium" color="onPrimarySoft">
              Đổi email
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
