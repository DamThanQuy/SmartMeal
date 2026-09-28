import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Bell,
  CreditCard,
  FileText,
  HeartPulse,
  Link2,
  Lock,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { MEMBERSHIP_STATUS_LABEL } from '@/features/premium';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useAppStore, type AppLanguage } from '@/state/app/appStore';
import { useAuthStore } from '@/state/auth/authStore';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import { ProfileMenuRow } from '../components/ProfileMenuRow';
import { useHealthConnectStatus } from '../hooks/useHealthConnect';

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>;

const THEME_MODE_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'Hệ thống' },
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
];

const LANGUAGE_OPTIONS: { id: AppLanguage; label: string }[] = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
];

// design/Settings.dc.html (design v2, Đợt 9). Đích mới cho icon "Cài đặt" ở ProfileScreen (Đợt
// 7 trỏ tạm MAIN_STACK_ROUTES.DEV — xem ProfileScreen.tsx). "Đổi mật khẩu" mở ForgotPasswordScreen
// (đăng ký thêm ở MainNavigator, sửa lệch sau Đợt 9 — xem ForgotPasswordScreen.tsx/OtpScreen.tsx)
// với returnTo='Settings' để quay lại đây sau khi xác thực OTP xong, không còn là nút chết.
// "Điều khoản sử dụng"/"Chính sách quyền riêng tư" vẫn no-op — đúng href="#" trong design (chủ
// ý). "Gói của tôi" trỏ SubscriptionScreen (Đợt 13). Mục "Dev" không có trong artboard — thêm để
// chứa ThemePreviewScreen (đã tạm trỏ từ icon Cài đặt suốt Đợt 0-8, nay dời vào đây theo đúng yêu
// cầu Đợt 9).
export function SettingsScreen({ navigation }: Props) {
  const { colors, mode, setMode } = useTheme();
  const language = useAppStore(state => state.language);
  const setLanguage = useAppStore(state => state.setLanguage);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const membershipStatus = usePremiumStore(state => state.status);
  const { data: healthConnect } = useHealthConnectStatus();

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Cài đặt" onBack={() => navigation.goBack()} />
      <View className="gap-lg py-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa hồ sơ"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.EDIT_PROFILE)}
          className="flex-row items-center gap-sm rounded-card bg-surface p-md"
        >
          <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-primary-soft">
            <AppText variant="h2" color="onPrimarySoft">
              {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium">{user?.fullName ?? 'Người dùng SmartMeal'}</AppText>
            <AppText variant="caption" color="secondary">
              {user?.email ?? ''}
            </AppText>
          </View>
          <AppText variant="bodyMedium" color="onPrimarySoft">
            Chỉnh sửa
          </AppText>
        </Pressable>

        <AppCard className="gap-xxs">
          <AppText variant="h3">Tài khoản</AppText>
          <ProfileMenuRow
            icon={<Lock size={20} color={colors.primary} />}
            label="Đổi mật khẩu"
            onPress={() =>
              navigation.navigate(MAIN_STACK_ROUTES.FORGOT_PASSWORD, { returnTo: 'Settings' })
            }
          />
          <ProfileMenuRow
            icon={<HeartPulse size={20} color={colors.primary} />}
            label="Hồ sơ sức khỏe"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.HEALTH_SETTINGS)}
          />
          <ProfileMenuRow
            icon={<CreditCard size={20} color={colors.primary} />}
            label="Gói của tôi"
            valueLabel={MEMBERSHIP_STATUS_LABEL[membershipStatus]}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.SUBSCRIPTION)}
          />
        </AppCard>

        <AppCard className="gap-md">
          <AppText variant="h3">Giao diện và ngôn ngữ</AppText>
          <View className="gap-xs">
            <AppText variant="body" color="secondary">
              Giao diện
            </AppText>
            <AppSegmentedControl options={THEME_MODE_OPTIONS} value={mode} onChange={setMode} />
          </View>
          <View className="gap-xs">
            <AppText variant="body" color="secondary">
              Ngôn ngữ
            </AppText>
            <AppSegmentedControl
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={setLanguage}
            />
          </View>
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3">Kết nối và nhắc nhở</AppText>
          <ProfileMenuRow
            icon={<Bell size={20} color={colors.primary} />}
            label="Nhắc nhở"
            valueLabel="Bữa ăn, uống nước"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.REMINDERS)}
          />
          <ProfileMenuRow
            icon={<Link2 size={20} color={colors.primary} />}
            label="Health Connect"
            valueLabel={healthConnect?.connected ? 'Đã kết nối' : 'Chưa kết nối'}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.HEALTH_CONNECT)}
          />
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3">Quyền riêng tư</AppText>
          <ProfileMenuRow
            icon={<FileText size={20} color={colors.primary} />}
            label="Điều khoản sử dụng"
            onPress={() => {}}
          />
          <ProfileMenuRow
            icon={<ShieldCheck size={20} color={colors.primary} />}
            label="Chính sách quyền riêng tư"
            onPress={() => {}}
          />
          <ProfileMenuRow
            icon={<Trash2 size={20} color={colors.error} />}
            label="Xóa dữ liệu cá nhân"
            tone="error"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.DELETE_DATA)}
          />
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3">Dev</AppText>
          <ProfileMenuRow
            icon={<Wrench size={20} color={colors.primary} />}
            label="Theme & mock scenario"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.DEV)}
          />
        </AppCard>

        <AppButton label="Đăng xuất" variant="outline" onPress={() => logout()} />
        <AppText variant="caption" color="muted" className="text-center">
          SmartMeal v1.0.0 · Đồ án PRM
        </AppText>
      </View>
    </ScreenContainer>
  );
}
