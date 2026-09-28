import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import type { AppColorTokens } from '@/theme/colors';
import type { ResolvedScheme } from '@/theme/ThemeProvider';

/** Map theme token của app sang Theme của React Navigation (nền/border lúc chuyển màn). */
export function getNavigationTheme(
  colors: AppColorTokens,
  resolvedScheme: ResolvedScheme,
): Theme {
  const base = resolvedScheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.error,
    },
  };
}
