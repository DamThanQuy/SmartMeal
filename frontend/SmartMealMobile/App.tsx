import './global.css';

/**
 * SmartMeal
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { LogBox, StatusBar } from 'react-native';

LogBox.ignoreAllLogs(true);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapSession, startSessionLifecycle } from '@/features/auth';
import { RealtimeNotificationBanner } from '@/features/profile';
import { AppNavigator } from '@/navigation/AppNavigator';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { getNavigationTheme } from '@/navigation/navigationTheme';
import { queryClient } from '@/services/api';
import { useAuthStore } from '@/state/auth/authStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function AppContent() {
  const { colors, resolvedScheme } = useTheme();
  const bootstrapStatus = useAuthStore(state => state.bootstrapStatus);

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, [bootstrapStatus]);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={getNavigationTheme(colors, resolvedScheme)}
    >
      {/* Android không còn hỗ trợ StatusBar.backgroundColor (edge-to-edge bắt buộc từ RN gần đây). */}
      <StatusBar
        barStyle={resolvedScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <AppNavigator />
      {/* Thông báo real-time: banner trên mọi màn / thông báo hệ thống khi app chạy nền — chỉ chạy khi đã đăng nhập. */}
      <RealtimeNotificationBanner />
    </NavigationContainer>
  );
}

function App() {
  useEffect(() => {
    // Luôn đảm bảo splash screen được ẩn nhanh chóng
    void SplashScreen.hideAsync().catch(() => {});
    const hideTimer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 500);

    // Phiên đăng nhập: đăng ký handler 401 + tự dọn khi đăng xuất, rồi khôi phục phiên đã lưu.
    const stopSessionLifecycle = startSessionLifecycle();
    void bootstrapSession();
    return () => {
      clearTimeout(hideTimer);
      stopSessionLifecycle();
    };
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
