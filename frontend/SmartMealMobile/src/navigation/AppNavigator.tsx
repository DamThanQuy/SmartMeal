import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ROOT_ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/state/auth/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// docs/structure_system.md mục 22 — App → Check Session → Authenticated? → Auth/Main.
// Đợt 9 (design v2, BR §2.1) — Guest cũng render Main (để xem Discovery/RecipeDetail), không có
// user thật; MainTabNavigator đọc isGuest để mở đúng tab Khám phá và chặn các tab cần tài khoản
// (xem MainTabNavigator.tsx).
export function AppNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isGuest = useAuthStore(state => state.isGuest);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated || isGuest ? (
        <Stack.Screen name={ROOT_ROUTES.MAIN} component={MainNavigator} />
      ) : (
        <Stack.Screen name={ROOT_ROUTES.AUTH} component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
