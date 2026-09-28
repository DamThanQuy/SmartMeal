import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, CalendarCheck, Leaf, ShoppingBasket, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppBadge, AppButton, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AuthGoogleButton } from '../components/AuthGoogleButton';
import { AuthSocialDivider } from '../components/AuthSocialDivider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const FEATURE_ROWS = [
  {
    icon: Sparkles,
    title: 'Chụp ảnh là ghi xong bữa ăn',
    description: 'AI nhận diện món, ước tính calo và macro',
  },
  {
    icon: ShoppingBasket,
    title: 'Thực đơn và đi chợ thông minh',
    description: 'Tự cộng dồn nguyên liệu, ước tính chi phí',
  },
  {
    icon: CalendarCheck,
    title: 'Nuôi Bé Mầm, giữ chuỗi ngày',
    description: 'Thói quen tốt được thưởng mỗi ngày',
  },
];

// design/Welcome.dc.html (design v2, Đợt 9) — màn đầu khi chưa đăng nhập, trước Main (Login),
// nay là initialRouteName của AuthNavigator (xem AuthNavigator.tsx). "Khám phá công thức không
// cần đăng nhập" đặt isGuest=true (BR §2.1 — Guest chỉ xem nội dung công khai/khám phá công
// thức) rồi vào MainTabs ở tab Khám phá (MainTabNavigator đọc isGuest để chọn initialRouteName).
export function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const continueAsGuest = useAuthStore(state => state.continueAsGuest);

  // AppNavigator render Main khi isGuest=true (xem AppNavigator.tsx) — MainTabNavigator tự chọn
  // initialRouteName=Discover cho Guest, không cần tự navigate() sang đây.
  const handleExploreAsGuest = () => continueAsGuest();

  return (
    <ScreenContainer scroll contentContainerClassName="gap-xl py-xxxl">
      <View className="flex-row items-center gap-sm">
        <Image
          source={require('../../../../assets/images/SmartMeal_App_Icon.png')}
          style={{ width: 48, height: 48, borderRadius: 12 }}
        />
        <AppText variant="h2">SmartMeal</AppText>
      </View>

      <View className="h-[190px] items-center justify-center overflow-hidden rounded-lg bg-primary-soft">
        <Sparkles size={64} color={colors.primary} />
        <AppBadge
          label="≈ 520 kcal · ước tính"
          tone="info"
          className="absolute left-sm top-sm bg-surface"
        />
        <AppBadge
          label="Chuỗi 5 ngày"
          tone="warning"
          className="absolute bottom-sm right-sm bg-surface"
        />
      </View>

      <View className="gap-xs">
        <AppText variant="h1">{'Ăn ngon. Sống khỏe.\nThông minh hơn.'}</AppText>
        <AppText variant="bodyLg" color="secondary">
          Theo dõi dinh dưỡng, lên thực đơn và ghi bữa ăn bằng AI.
        </AppText>
      </View>

      <View className="gap-md">
        {FEATURE_ROWS.map(row => (
          <View key={row.title} className="flex-row items-center gap-sm">
            <View className="h-[44px] w-[44px] items-center justify-center rounded-md bg-primary-soft">
              <row.icon size={22} color={colors.primary} />
            </View>
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyMedium">{row.title}</AppText>
              <AppText variant="caption" color="secondary">
                {row.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View className="gap-sm">
        <AppButton
          label="Bắt đầu miễn phí"
          onPress={() => navigation.navigate(AUTH_ROUTES.REGISTER)}
        />
        <AppButton
          label="Tôi đã có tài khoản"
          variant="outline"
          onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
        />
        <AuthSocialDivider />
        <AuthGoogleButton label="Tiếp tục với Google" onPress={() => {}} />
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
