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
import { AppNavigator } from '@/navigation/AppNavigator';
import { getNavigationTheme } from '@/navigation/navigationTheme';
import { queryClient } from '@/services/api';
import { hydrateLanguage, hydrateMockScenario } from '@/state/app/appStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Giữ splash screen native hiển thị cho tới khi ThemeProvider đọc xong theme mode đã lưu
// (AsyncStorage bất đồng bộ) — tránh chớp sáng/tối lúc khởi động.
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { colors, resolvedScheme } = useTheme();

  return (
    <NavigationContainer theme={getNavigationTheme(colors, resolvedScheme)}>
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
  // như theme mode (xem ThemeProvider.onReady bên dưới).
  useEffect(() => {
    void hydrateMockScenario();
    void hydrateLanguage();
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider onReady={() => SplashScreen.hideAsync()}>
            <AppContent />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
