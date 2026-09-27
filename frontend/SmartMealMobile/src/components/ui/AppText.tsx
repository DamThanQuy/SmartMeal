import React from 'react';
import { Text, type TextProps } from 'react-native';
import type { AppTextVariant } from '@/theme/typography';

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
  | 'onPrimarySoft';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: AppTextColor;
  className?: string;
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
  onPrimarySoft: 'text-on-primary-soft',
};

export function AppText({
  variant = 'body',
  color = 'primary',
  className = '',
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      className={`${VARIANT_CLASSNAME[variant]} ${COLOR_CLASSNAME[color]} ${className}`}
      {...rest}
    >
      {children}
    </Text>
  );
}
