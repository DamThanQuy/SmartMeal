import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme, View } from 'react-native';
import { STORAGE_KEYS } from '@/constants/storage';
import { storageService } from '@/services/storage/storage';
import { type AppColorTokens, darkColors, lightColors } from './colors';
import { darkThemeVars, lightThemeVars } from './cssVars';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Lựa chọn người dùng: theo hệ thống, hoặc ép sáng/tối. */
  mode: ThemeMode;
  /** Giá trị đã resolve thực tế (không bao giờ là 'system'), dùng cho icon/chart/StatusBar... */
  resolvedScheme: ResolvedScheme;
  /** Object màu JS của theme đang active — cho chỗ không dùng className được. */
  colors: AppColorTokens;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = storageService.getString(STORAGE_KEYS.THEME_MODE);
    return isThemeMode(stored) ? stored : 'system';
  });

  const resolvedScheme: ResolvedScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  // Đồng bộ NativeWind's colorScheme để bất kỳ dark: variant nào (nếu có dùng) cũng khớp.
  // Nguồn màu chính vẫn là CSS variables (lightThemeVars/darkThemeVars) áp lên root View bên dưới.
  useLayoutEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    storageService.setString(STORAGE_KEYS.THEME_MODE, nextMode);
  };

  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;
  const themeVars = resolvedScheme === 'dark' ? darkThemeVars : lightThemeVars;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedScheme, colors, setMode }),
    [mode, resolvedScheme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className="flex-1" style={themeVars}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme() phải được gọi bên trong <ThemeProvider>.');
  }
  return context;
}
