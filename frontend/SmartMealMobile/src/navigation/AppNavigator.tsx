import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ROOT_ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/state/auth/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// docs/structure_system.md mục 22 — App → Check Session → Authenticated? → Auth/Main.
export function AppNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name={ROOT_ROUTES.MAIN} component={MainNavigator} />
      ) : (
        <Stack.Screen name={ROOT_ROUTES.AUTH} component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
