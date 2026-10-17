import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Flame,
  Leaf,
  Sparkles,
  Sprout,
  UserRound,
} from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppBadge, AppButton, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import { PetAnimation } from '@/features/gamification';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const FEATURE_ROWS = [
  {
    icon: Sparkles,
    title: 'Chụp ảnh là ghi xong bữa ăn',
    description: 'AI nhận diện món, ước tính calo và macro',
  },
  {
    icon: CalendarDays,
    title: 'Thực đơn và đi chợ thông minh',
    description: 'Tự cộng dồn nguyên liệu, ước tính chi phí',
  },
  {
    icon: Sprout,
    title: 'Nuôi Bé Mầm, giữ chuỗi ngày',
    description: 'Thói quen tốt được thưởng mỗi ngày',
  },
];

// Lá trang trí ở góc màn (docs/landingpage.png) — chỉ để trang trí, mờ để không tranh chữ.
const DECOR_LEAVES = [
  { size: 120, style: { top: -24, right: -40, transform: [{ rotate: '-30deg' }] } },
  { size: 96, style: { bottom: -24, left: -48, transform: [{ rotate: '40deg' }] } },
  { size: 88, style: { bottom: -16, right: -32, transform: [{ rotate: '-120deg' }] } },
] as const;
const DECOR_LEAF_OPACITY = 0.08;
const HERO_BOWL_SIZE = 112;

// design/Welcome.dc.html + docs/landingpage.png (design v2, Đợt 9) — màn đầu khi chưa đăng nhập,
// initialRouteName của AuthNavigator (xem AuthNavigator.tsx). Số liệu trong thẻ hero là hình minh hoạ
// sản phẩm (≈ ước tính, BR-061), không phải dữ liệu của người dùng. "Khám phá công thức không cần đăng
// nhập" đặt isGuest=true (BR §2.1) rồi vào MainTabs ở tab Khám phá.
export function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const continueAsGuest = useAuthStore(state => state.continueAsGuest);

  // AppNavigator render Main khi isGuest=true (xem AppNavigator.tsx) — MainTabNavigator tự chọn
  // initialRouteName=Discover cho Guest, không cần tự navigate() sang đây.
  const handleExploreAsGuest = () => continueAsGuest();

  return (
    <ScreenContainer scroll contentContainerClassName="gap-xl py-xl">
      <View
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {DECOR_LEAVES.map(leaf => (
          <View key={`${leaf.size}`} className="absolute" style={[leaf.style, { opacity: DECOR_LEAF_OPACITY }]}>
            <Leaf size={leaf.size} color={colors.primary} fill={colors.primary} />
          </View>
        ))}
      </View>

      <Image
        accessibilityLabel="SmartMeal — Ăn ngon, Sống khỏe, Thông minh"
        source={require('../../../../assets/images/SmartMeal_Logo.png')}
        style={{ width: 240, height: 78 }}
        resizeMode="contain"
      />

      <View className="rounded-lg" style={shadows.card}>
        <LinearGradient
          colors={[colors.primaryPressed, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.lg, overflow: 'hidden' }}
        >
          <View className="h-[184px] flex-row">
            <View className="flex-1 justify-between p-md">
              <View className="h-[28px] flex-row items-center gap-xxs self-start rounded-pill bg-overlay/20 px-sm">
                <Flame size={14} color={colors.onPrimary} />
                <AppText variant="caption" color="onPrimary" className="font-sans-semibold">
                  ≈ 520 kcal · Ước tính
                </AppText>
              </View>
              <View>
                <AppText variant="bodyMedium" color="onPrimary" className="opacity-80">
                  Bữa ăn hôm nay
                </AppText>
                <AppText variant="h1" color="onPrimary">
                  {'Ngon hơn.\nKhỏe hơn.'}
                </AppText>
              </View>
            </View>

            <View className="w-[152px]" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {/* Quầng sáng sau Bé Mầm để linh vật (màu xanh) không chìm vào nền thẻ. */}
              <View
                className="absolute bg-surface/25"
                style={{ top: 8, right: -24, width: 168, height: 168, borderRadius: radius.pill }}
              />
              <View className="absolute" style={{ top: -30, left: 16 }}>
                <PetAnimation stage={2} size={132} />
              </View>
              <Image
                source={require('../../../../assets/images/meal-bowl.jpg')}
                className="border-4 border-surface"
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 8,
                  width: HERO_BOWL_SIZE,
                  height: HERO_BOWL_SIZE,
                  borderRadius: radius.pill,
                }}
              />
              <AppBadge
                label="Chuỗi 5 ngày"
                tone="warning"
                icon={<Clock size={14} color={colors.warningText} />}
                className="absolute bottom-sm right-sm h-[28px]"
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      <View className="gap-xs">
        <AppText variant="display">{'Ăn ngon. Sống khỏe.\nThông minh hơn.'}</AppText>
        <AppText variant="bodyLg" color="secondary">
          Theo dõi dinh dưỡng, lên thực đơn và ghi bữa ăn bằng AI.
        </AppText>
      </View>

      <View className="gap-md">
        {FEATURE_ROWS.map(row => (
          <View key={row.title} className="flex-row items-center gap-md">
            <View className="h-[48px] w-[48px] items-center justify-center rounded-md bg-primary-soft">
              <row.icon size={24} color={colors.onPrimarySoft} />
            </View>
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyMedium">{row.title}</AppText>
              <AppText variant="body" color="secondary">
                {row.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View className="gap-sm">
        <AppButton
          label="Bắt đầu miễn phí"
          shape="pill"
          size="lg"
          leftIcon={<UserRound size={20} color={colors.onPrimary} />}
          rightIcon={<ArrowRight size={20} color={colors.onPrimary} />}
          onPress={() => navigation.navigate(AUTH_ROUTES.REGISTER)}
        />
        <AppButton
          label="Tôi đã có tài khoản"
          variant="outline"
          shape="pill"
          size="lg"
          onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Khám phá công thức không cần đăng nhập"
        className="min-h-[44px] flex-row items-center justify-center gap-xs"
        onPress={handleExploreAsGuest}
      >
        <AppText variant="bodyMedium" color="onPrimarySoft">
          Khám phá công thức không cần đăng nhập
        </AppText>
        <ArrowRight size={16} color={colors.onPrimarySoft} />
      </Pressable>
    </ScreenContainer>
  );
}
