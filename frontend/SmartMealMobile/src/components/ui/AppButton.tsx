import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, type AppTextColor } from './AppText';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type AppButtonShape = 'rounded' | 'pill';
export type AppButtonSize = 'md' | 'lg';

export interface AppButtonProps
  extends Omit<PressableProps, 'children' | 'disabled'> {
  label: string;
  variant?: AppButtonVariant;
  /** 'rounded' = radius 12 (design.md mục 40); 'pill' = bo tròn hẳn (CTA màn Welcome). */
  shape?: AppButtonShape;
  /** 'md' cao 48 (mặc định); 'lg' cao 56 cho CTA chính. */
  size?: AppButtonSize;
  /** Icon trước/sau nhãn — màu lấy từ useTheme() ở nơi gọi, khớp màu chữ của variant. */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

interface VariantStyle {
  className: string;
  textColor: AppTextColor;
  spinnerColorToken: 'onPrimary' | 'onPrimarySoft' | 'primary';
}

// docs/design.md mục 40 (Button System) — Primary/Secondary/Outline/Text.
// Radius 12px = rounded-md (src/theme/radius.ts). Height 48px là spec riêng của button,
// không nằm trong thang spacing 4px nên dùng giá trị arbitrary [48px] tại đúng 1 chỗ này.
const VARIANT_STYLES: Record<AppButtonVariant, VariantStyle> = {
  primary: {
    className: 'bg-primary active:bg-primary-pressed disabled:opacity-40',
    textColor: 'onPrimary',
    spinnerColorToken: 'onPrimary',
  },
  secondary: {
    className: 'bg-primary-soft active:opacity-70 disabled:opacity-40',
    textColor: 'onPrimarySoft',
    spinnerColorToken: 'onPrimarySoft',
  },
  outline: {
    className:
      'border border-border bg-transparent active:bg-surface-subtle disabled:opacity-40',
    textColor: 'primary',
    spinnerColorToken: 'primary',
  },
  text: {
    className: 'bg-transparent active:opacity-60 disabled:opacity-40',
    textColor: 'primary',
    spinnerColorToken: 'primary',
  },
};

const SHAPE_CLASSNAME: Record<AppButtonShape, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-pill',
};

const SIZE_CLASSNAME: Record<AppButtonSize, string> = {
  md: 'h-[48px] px-lg',
  lg: 'h-[56px] px-xl',
};

export function AppButton({
  label,
  variant = 'primary',
  shape = 'rounded',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  className = '',
  ...rest
}: AppButtonProps) {
  const styleForVariant = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;
  // ActivityIndicator không nhận className/màu qua theme token — lấy màu JS từ useTheme().
  const { colors } = useTheme();
  const spinnerColor = colors[styleForVariant.spinnerColorToken];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-xs ${SIZE_CLASSNAME[size]} ${SHAPE_CLASSNAME[shape]} ${styleForVariant.className} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {leftIcon}
          <AppText variant="button" color={styleForVariant.textColor}>
            {label}
          </AppText>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}
