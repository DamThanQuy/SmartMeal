import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Activity,
  Bell,
  LogOut,
  PawPrint,
  Salad,
  Settings,
  Sparkles,
  TriangleAlert,
  User,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ScreenContainer, UserAvatar } from '@/components/common';
import { AppBadge, AppCard, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS, DIETARY_PREFERENCE_OPTIONS } from '@/features/health';
import { MEMBERSHIP_BADGE_LABEL } from '@/features/premium';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { isProMembership, usePremiumStore } from '@/state/premium/premiumStore';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileMenuRow } from '../components/ProfileMenuRow';

// design/Profile.dc.html (BR-001→BR-003). Là MAIN_TAB_ROUTES.PROFILE. Icon "Cài đặt" mở
// SettingsScreen (Đợt 9, design v2) — ThemePreviewScreen (MAIN_STACK_ROUTES.DEV) nay nằm trong
// mục Dev của Settings, không còn mở trực tiếp từ đây.
export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const profile = useUserProfileStore();
  const membershipStatus = usePremiumStore(state => state.status);
  const isPremium = isProMembership(membershipStatus);

  const allergyLabels = profile.allergyIds
    .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const dietaryLabels = profile.dietaryPreferenceIds
    .map(id => DIETARY_PREFERENCE_OPTIONS.find(option => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  // AppNavigator điều kiện render Auth/Main theo isAuthenticated (BR-014) — chỉ cần logout(),
  // không cần tự reset navigation (xem src/navigation/AppNavigator.tsx).
  const handleLogout = () => logout();

  return (
    <ScreenContainer scroll contentContainerClassName="gap-lg">
      <View className="flex-row items-center gap-sm py-xs">
        <UserAvatar name={user?.fullName} uri={user?.avatarUrl} size={64} textVariant="h1" />
        <View className="flex-1 gap-xxs">
          <AppText variant="h2">{user?.fullName ?? 'Người dùng SmartMeal'}</AppText>
          <AppBadge label={MEMBERSHIP_BADGE_LABEL[membershipStatus]} tone={isPremium ? 'primary' : 'neutral'} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cài đặt"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.SETTINGS)}
          className="h-[44px] w-[44px] items-center justify-center rounded-md bg-surface"
        >
          <Settings size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {!isPremium ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nâng cấp SmartMeal Pro"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PREMIUM)}
          className="flex-row items-center gap-sm rounded-card bg-primary-soft p-md"
        >
          <Sparkles size={24} color={colors.primary} />
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium">Nâng cấp SmartMeal Pro</AppText>
            <AppText variant="caption" color="secondary">
              AI Snap không giới hạn, Fridge Scanner…
            </AppText>
          </View>
        </Pressable>
      ) : null}

      <AppCard className="gap-sm">
        <AppText variant="h3">Chi tiết sức khỏe</AppText>
        <ProfileMenuRow
          icon={<User size={20} color={colors.primary} />}
          label="Hồ sơ sức khỏe"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.WEIGHT_HISTORY)}
        />
        <ProfileMenuRow
          icon={<TriangleAlert size={20} color={colors.primary} />}
          label="Dị ứng"
          valueLabel={allergyLabels.length > 0 ? allergyLabels.join(', ') : 'Không có'}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.HEALTH_SETTINGS)}
        />
        <ProfileMenuRow
          icon={<Salad size={20} color={colors.primary} />}
          label="Chế độ ăn"
          valueLabel={dietaryLabels.length > 0 ? dietaryLabels.join(', ') : 'Không có'}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.HEALTH_SETTINGS)}
        />
        <ProfileMenuRow
          icon={<Activity size={20} color={colors.primary} />}
          label="Health Connect"
          valueLabel="Đã kết nối"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.HEALTH_CONNECT)}
        />
        <ProfileMenuRow
          icon={<Bell size={20} color={colors.primary} />}
          label="Nhắc nhở"
          valueLabel="Bữa ăn, uống nước"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.REMINDERS)}
        />
        <ProfileMenuRow
          icon={<PawPrint size={20} color={colors.primary} />}
          label="Linh vật & thử thách"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PET)}
        />
        <ProfileMenuRow
          icon={<LogOut size={20} color={colors.error} />}
          label="Đăng xuất"
          tone="error"
          onPress={handleLogout}
        />
      </AppCard>
    </ScreenContainer>
  );
}
