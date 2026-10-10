import './global.css';

/**
 * SmartMeal
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapSession, startSessionLifecycle } from '@/features/auth';
import { AppNavigator } from '@/navigation/AppNavigator';
import { navigationRef } from '@/navigation/navigationRef';
import { getNavigationTheme } from '@/navigation/navigationTheme';
import { queryClient } from '@/services/api';
import { hydrateLanguage, hydrateMockScenario } from '@/state/app/appStore';
import { useAuthStore } from '@/state/auth/authStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Giữ splash screen native hiển thị cho tới khi ThemeProvider đọc xong theme mode đã lưu
// (AsyncStorage bất đồng bộ) và biết người dùng đã đăng nhập hay chưa (AppContent bên dưới) —
// tránh chớp sáng/tối hoặc chớp màn Welcome lúc khởi động.
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { colors, resolvedScheme } = useTheme();
  const bootstrapStatus = useAuthStore(state => state.bootstrapStatus);

  // AppContent chỉ mount sau khi theme đã sẵn sàng; còn phải chờ khôi phục phiên (đọc token +
  // GET /auth/me — sessionService.bootstrapSession) xong rồi mới ẩn splash.
  useEffect(() => {
    if (bootstrapStatus !== 'loading') {
      void SplashScreen.hideAsync();
    }
    if (typeof window !== 'undefined') {
      (window as any).navigationRef = navigationRef;
    }
  }, [bootstrapStatus]);

  return (
    <NavigationContainer ref={navigationRef} theme={getNavigationTheme(colors, resolvedScheme)}>
      {/* Android không còn hỗ trợ StatusBar.backgroundColor (edge-to-edge bắt buộc từ RN gần đây). */}
      <StatusBar
        barStyle={resolvedScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <AppNavigator />
    </NavigationContainer>
  );
}

function App() {
  // Công tắc dev/QA, không phải dữ liệu người dùng — hydrate không cần chặn splash screen
  // như theme mode (xem ThemeProvider bên dưới).
  useEffect(() => {
    void hydrateMockScenario();
    void hydrateLanguage();
    // Phiên đăng nhập: đăng ký handler 401 + tự dọn khi đăng xuất, rồi khôi phục phiên đã lưu.
    const stopSessionLifecycle = startSessionLifecycle();
    void bootstrapSession();
    return stopSessionLifecycle;
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
