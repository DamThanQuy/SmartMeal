import { vars } from 'nativewind';
import { camelToKebabCase, hexToRgbChannel } from '@/utils/color';
import { type AppColorTokens, darkColors, lightColors } from './colors';

function toCssVariables(colors: AppColorTokens): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, hex]) => [
      `--color-${camelToKebabCase(key)}`,
      hexToRgbChannel(hex),
    ]),
  );
}

// Áp dụng lên style của 1 root View (xem ThemeProvider) — mọi className màu bên trong
// (bg-surface, text-text-primary...) tự đổi theo theme đang active, không cần viết dark:.
export const lightThemeVars = vars(toCssVariables(lightColors));
export const darkThemeVars = vars(toCssVariables(darkColors));
