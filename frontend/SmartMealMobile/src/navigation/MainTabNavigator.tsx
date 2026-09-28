import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CalendarDays, Compass, Home, NotebookText, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { DashboardScreen } from '@/features/dashboard';
import { GroceryScreen } from '@/features/grocery';
import { currentWeekStartIso, MealPlannerScreen } from '@/features/meal-planner';
import { DiaryScreen } from '@/features/nutrition';
import { ProfileScreen } from '@/features/profile';
import { DiscoveryScreen } from '@/features/recipes';
import { MAIN_TAB_ROUTES } from '@/constants/routes';
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

// Đợt 6 — Thực đơn/Đi chợ là 1 tab với toggle cục bộ (AppSegmentedControl trong mỗi Screen),
// không phải 2 bottom tab riêng hay 1 Stack lồng — cả 2 màn đều cần giữ bottom nav hiển thị
// (đúng design/MealPlanner.dc.html, Grocery.dc.html) nên dùng state cục bộ thay vì Stack.Screen
// con (Stack con sẽ che navigator Tab bên ngoài). weekStartIso lift lên đây để cả 2 màn dùng
// chung 1 tuần đang xem (BR-170: Grocery phải tổng hợp đúng thực đơn tuần MealPlanner đang mở).
function PlannerTab() {
  const [view, setView] = useState<'planner' | 'grocery'>('planner');
  const [weekStartIso, setWeekStartIso] = useState(currentWeekStartIso());

  if (view === 'grocery') {
    return (
      <GroceryScreen weekStartIso={weekStartIso} onOpenMealPlanner={() => setView('planner')} />
    );
  }

  return (
    <MealPlannerScreen
      weekStartIso={weekStartIso}
      onChangeWeek={setWeekStartIso}
      onOpenGrocery={() => setView('grocery')}
    />
  );
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
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}
