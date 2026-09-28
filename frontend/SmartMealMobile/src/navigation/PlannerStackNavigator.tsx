import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { GroceryScreen } from '@/features/grocery';
import { MealPlannerScreen } from '@/features/meal-planner';
import { PLANNER_STACK_ROUTES } from '@/constants/routes';
import type { PlannerStackParamList } from './types';

const Stack = createNativeStackNavigator<PlannerStackParamList>();

// Đợt 11 (sửa lệch) — Grocery tách thành route riêng (trước là toggle cục bộ bằng useState trong
// MainTabNavigator) để Notifications/deep-link khác điều hướng thẳng được. Lồng trong 1 Stack
// riêng của tab Thực đơn (thay vì đặt ở MainNavigator cùng cấp MainTabs) để bottom tab bar vẫn
// hiển thị — 1 Stack lồng bên trong 1 Tab.Screen KHÔNG che navigator Tab cha, đây là cách làm
// chuẩn của React Navigation (ghi chú cũ trong MainTabNavigator.tsx cho rằng Stack con sẽ che
// Tab bar là chưa đúng — xem MainTabNavigator.tsx).
export function PlannerStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={PLANNER_STACK_ROUTES.MEAL_PLANNER}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={PLANNER_STACK_ROUTES.MEAL_PLANNER} component={MealPlannerScreen} />
      <Stack.Screen name={PLANNER_STACK_ROUTES.GROCERY} component={GroceryScreen} />
    </Stack.Navigator>
  );
}
