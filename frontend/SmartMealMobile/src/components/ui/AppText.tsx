import React from 'react';
import { Text, type TextProps } from 'react-native';
import { lightColors } from '@/theme/colors';
import type { AppTextVariant } from '@/theme/typography';
import { camelToKebabCase } from '@/utils/color';

export type AppTextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'onPrimary'
  | 'onEnergy'
  | 'onPrimarySoft';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: AppTextColor;
  className?: string;
  style?: import('react-native').TextStyle;
  children?: React.ReactNode;
}

// docs/design.md mục 6.2 — Typography Scale (size/line-height/weight theo variant).
// Weight thể hiện qua đúng font family (Inter-Regular/SemiBold/Bold) theo CLAUDE.md mục 6
// — không set thêm fontWeight kèm fontFamily custom.
const VARIANT_CLASSNAME: Record<AppTextVariant, string> = {
  display: 'text-display font-sans-bold',
  h1: 'text-h1 font-sans-bold',
  h2: 'text-h2 font-sans-bold',
  h3: 'text-h3 font-sans-semibold',
  bodyLg: 'text-body-lg font-sans',
  body: 'text-body font-sans',
  bodyMedium: 'text-body-medium font-sans-semibold',
  caption: 'text-caption font-sans',
  button: 'text-button font-sans-semibold',
};

const COLOR_CLASSNAME: Record<AppTextColor, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  inverse: 'text-text-inverse',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  onPrimary: 'text-on-primary',
  onEnergy: 'text-on-energy',
  onPrimarySoft: 'text-on-primary-soft',
};

// Màu chữ đặt qua className ("text-text-inverse", "text-on-primary/80"...) thay hẳn màu của prop `color` — không để
// cả hai class: NativeWind xếp utility theo thứ tự chữ cái chứ không theo thứ tự trong className, nên màu mặc định
// "text-text-primary" sẽ đè mất (chữ tối trên nền tối của SuccessToast, màn camera...).
const TEXT_COLOR_CLASS = new RegExp(
  `(?:^|\\s)text-(?:${Object.keys(lightColors).map(camelToKebabCase).join('|')})(?:/\\d+)?(?=\\s|$)`,
);

export function AppText({
  variant = 'body',
  color = 'primary',
  className = '',
  style,
  children,
  ...rest
}: AppTextProps) {
  const colorClassName = TEXT_COLOR_CLASS.test(className)
    ? ''
    : COLOR_CLASSNAME[color];
  return (
    <Text
      className={`${VARIANT_CLASSNAME[variant]} ${colorClassName} ${className}`}
      style={[
        { includeFontPadding: false, textAlignVertical: 'center' },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
