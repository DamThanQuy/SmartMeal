import {
  createBottomTabNavigator,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BookOpen,
  CalendarDays,
  Home,
  Search,
  CircleUserRound,
} from 'lucide-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from '@/features/dashboard';
import { DiaryScreen } from '@/features/nutrition';
import { ProfileScreen } from '@/features/profile';
import { DiscoveryScreen } from '@/features/recipes';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily, fontSize } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { PlannerStackNavigator } from './PlannerStackNavigator';
import type { MainStackParamList, MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  color: string;
  size: number;
}

// Định nghĩa ở module scope (không phải trong MainTabNavigator) để tránh tạo component mới
// mỗi lần render (react/no-unstable-nested-components).
function HomeTabIcon({ color, size }: TabIconProps) {
  return <Home color={color} size={size} />;
}

function DiscoverTabIcon({ color, size }: TabIconProps) {
  return <Search color={color} size={size} />;
}

function DiaryTabIcon({ color, size }: TabIconProps) {
  return <BookOpen color={color} size={size} />;
}

function PlannerTabIcon({ color, size }: TabIconProps) {
  return <CalendarDays color={color} size={size} />;
}

function ProfileTabIcon({ color, size }: TabIconProps) {
  return <CircleUserRound color={color} size={size} />;
}

// Đợt 9 (design v2, BR §2.1) — Guest chỉ được xem Discovery/RecipeDetail, các tab còn lại (đọc
// dữ liệu cá nhân: Dashboard/Diary/Planner/Profile) mở GuestPromptScreen thay vì chuyển tab.
// getParent() vì GuestPrompt là route ở MainStackParamList (sibling của MainTabs), không nằm
// trong MainTabParamList — xem MainNavigator.tsx.
function useGuestTabGuardListeners(isGuest: boolean) {
  return ({
    navigation,
  }: {
    navigation: BottomTabNavigationProp<MainTabParamList>;
  }) => ({
    tabPress: (e: { preventDefault: () => void }) => {
      if (!isGuest) return;
      e.preventDefault();
      navigation
        .getParent<NativeStackNavigationProp<MainStackParamList>>()
        ?.navigate(MAIN_STACK_ROUTES.GUEST_PROMPT);
    },
  });
}

export function MainTabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isGuest = useAuthStore(state => state.isGuest);
  const guestGuardListeners = useGuestTabGuardListeners(isGuest);

  return (
    <Tab.Navigator
      initialRouteName={
        isGuest ? MAIN_TAB_ROUTES.DISCOVER : MAIN_TAB_ROUTES.HOME
      }
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fontFamily.sans,
          fontSize: fontSize.caption.size,
          lineHeight: fontSize.caption.lineHeight,
          marginTop: spacing.xxs,
        },
        tabBarItemStyle: { paddingVertical: spacing.xxs },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: spacing.xxxl + spacing.xl + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tab.Screen
        name={MAIN_TAB_ROUTES.HOME}
        component={DashboardScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: HomeTabIcon,
        }}
        listeners={guestGuardListeners}
      />
      <Tab.Screen
        name={MAIN_TAB_ROUTES.PLANNER}
        component={PlannerStackNavigator}
        options={{
          title: 'Bữa ăn',
          tabBarIcon: PlannerTabIcon,
        }}
        listeners={guestGuardListeners}
      />
      <Tab.Screen
        name={MAIN_TAB_ROUTES.DISCOVER}
        component={DiscoveryScreen}
        options={{
          title: 'Khám phá',
          tabBarIcon: DiscoverTabIcon,
        }}
      />
      <Tab.Screen
        name={MAIN_TAB_ROUTES.DIARY}
        component={DiaryScreen}
        options={{
          title: 'Nhật ký',
          tabBarIcon: DiaryTabIcon,
        }}
        listeners={guestGuardListeners}
      />
      <Tab.Screen
        name={MAIN_TAB_ROUTES.PROFILE}
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ProfileTabIcon,
        }}
        listeners={guestGuardListeners}
      />
    </Tab.Navigator>
  );
}
