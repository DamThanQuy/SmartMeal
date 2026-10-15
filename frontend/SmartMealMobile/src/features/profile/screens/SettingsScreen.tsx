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
  UserX,
  Wrench,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ScreenContainer, ScreenHeader, UserAvatar } from '@/components/common';
import { AppButton, AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { MEMBERSHIP_STATUS_LABEL } from '@/features/premium';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
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

// design/Settings.dc.html (design v2, Đợt 9). Đích mới cho icon "Cài đặt" ở ProfileScreen (Đợt
// 7 trỏ tạm MAIN_STACK_ROUTES.DEV — xem ProfileScreen.tsx). "Đổi mật khẩu" mở ChangePasswordScreen
// (xác nhận bằng mật khẩu hiện tại, không cần email OTP); tài khoản chưa có mật khẩu (tạo bằng
// Google) thấy "Tạo mật khẩu" và đi luồng ForgotPassword/OTP với returnTo='Settings'.
// "Điều khoản sử dụng"/"Chính sách quyền riêng tư" mở LegalScreen (văn bản tĩnh). "Gói của tôi" trỏ SubscriptionScreen (Đợt 13). Mục "Dev" không có trong artboard — thêm để
// chứa ThemePreviewScreen (đã tạm trỏ từ icon Cài đặt suốt Đợt 0-8, nay dời vào đây theo đúng yêu
// cầu Đợt 9).
export function SettingsScreen({ navigation }: Props) {
  const { colors, mode, setMode } = useTheme();
  const user = useAuthStore(state => state.user);
  // Tài khoản tạo bằng Google chưa có mật khẩu: "Tạo mật khẩu" qua email OTP thay vì đổi mật khẩu.
  const hasPassword = user?.hasPassword !== false;
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
          <UserAvatar name={user?.fullName} uri={user?.avatarUrl} size={56} />
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
            label={hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
            onPress={() =>
              hasPassword
                ? navigation.navigate(MAIN_STACK_ROUTES.CHANGE_PASSWORD)
                : navigation.navigate(MAIN_STACK_ROUTES.FORGOT_PASSWORD, { returnTo: 'Settings' })
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
          <AppText variant="h3">Giao diện</AppText>
          <AppSegmentedControl options={THEME_MODE_OPTIONS} value={mode} onChange={setMode} />
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
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.LEGAL, { document: 'terms' })}
          />
          <ProfileMenuRow
            icon={<ShieldCheck size={20} color={colors.primary} />}
            label="Chính sách quyền riêng tư"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.LEGAL, { document: 'privacy' })}
          />
          <ProfileMenuRow
            icon={<Trash2 size={20} color={colors.error} />}
            label="Xóa dữ liệu cá nhân"
            tone="error"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.DELETE_DATA)}
          />
          <ProfileMenuRow
            icon={<UserX size={20} color={colors.error} />}
            label="Xóa tài khoản"
            tone="error"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.DELETE_ACCOUNT)}
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
