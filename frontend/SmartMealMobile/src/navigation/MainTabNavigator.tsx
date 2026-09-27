import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CalendarDays, Compass, Home, NotebookText, User } from 'lucide-react-native';
import React from 'react';
import { DashboardScreen } from '@/features/dashboard';
import { DiaryScreen } from '@/features/nutrition';
import { DiscoveryScreen } from '@/features/recipes';
import { EmptyState, ScreenContainer } from '@/components/common';
import { MAIN_TAB_ROUTES } from '@/constants/routes';
import { ThemePreviewScreen } from '@/features/dev';
import { useTheme } from '@/theme/ThemeProvider';
import type { MainTabParamList } from './types';

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
  return <Compass color={color} size={size} />;
}

function DiaryTabIcon({ color, size }: TabIconProps) {
  return <NotebookText color={color} size={size} />;
}

function PlannerTabIcon({ color, size }: TabIconProps) {
  return <CalendarDays color={color} size={size} />;
}

function ProfileTabIcon({ color, size }: TabIconProps) {
  return <User color={color} size={size} />;
}

interface ComingSoonTabProps {
  title: string;
}

// Placeholder cho các tab chưa được dựng UI (Đợt 6) — thay bằng Screen thật đúng feature
// khi tới đợt tương ứng trong CLAUDE.md mục 10. Không tạo file Screen riêng trong feature vì
// đây chỉ là khung điều hướng tạm, không phải artboard thật.
function ComingSoonTab({ title }: ComingSoonTabProps) {
  return (
    <ScreenContainer>
      <EmptyState
        title={title}
        description="Màn hình này sẽ được dựng UI ở đợt tiếp theo."
      />
    </ScreenContainer>
  );
}

function PlannerTab() {
  return <ComingSoonTab title="Thực đơn" />;
}

// TODO: thay bằng ProfileScreen thật ở Đợt 7 (docs/ui-mock-prompts.md Phase 7) — tạm dùng
// ThemePreviewScreen làm entry point để xem token/toggle theme trong lúc chưa có màn Cá nhân.
function ProfileTab() {
  return <ThemePreviewScreen />;
}

export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
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
      />
      <Tab.Screen
        name={MAIN_TAB_ROUTES.PLANNER}
        component={PlannerTab}
        options={{
          title: 'Thực đơn',
          tabBarIcon: PlannerTabIcon,
        }}
      />
      <Tab.Screen
        name={MAIN_TAB_ROUTES.PROFILE}
        component={ProfileTab}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}
