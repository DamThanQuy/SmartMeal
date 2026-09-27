import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { shadows } from '@/theme/shadows';

export type AppIconButtonVariant = 'default' | 'soft' | 'elevated';
export type AppIconButtonShape = 'circle' | 'square';

export interface AppIconButtonProps
  extends Omit<PressableProps, 'children' | 'disabled' | 'style'> {
  icon: React.ReactNode;
  /** Bắt buộc — icon button không có text hiển thị nên luôn cần accessibilityLabel. */
  accessibilityLabel: string;
  variant?: AppIconButtonVariant;
  /** 'square' = rounded-md (dùng cho nút back có shadow trên header — design.md các màn Auth/Health). */
  shape?: AppIconButtonShape;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_CLASSNAME: Record<AppIconButtonVariant, string> = {
  default: 'bg-transparent active:bg-surface-subtle disabled:opacity-40',
  soft: 'bg-primary-soft active:opacity-70 disabled:opacity-40',
  elevated: 'bg-surface active:bg-surface-subtle disabled:opacity-40',
};

const SHAPE_CLASSNAME: Record<AppIconButtonShape, string> = {
  circle: 'rounded-full',
  square: 'rounded-md',
};

export function AppIconButton({
  icon,
  accessibilityLabel,
  variant = 'default',
  shape = 'circle',
  disabled = false,
  className = '',
  style,
  ...rest
}: AppIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      // 44x44 — touch target tối thiểu (docs/.claude/rules/typescript-mobile.md, Accessibility).
      className={`min-h-[44px] min-w-[44px] items-center justify-center ${SHAPE_CLASSNAME[shape]} ${VARIANT_CLASSNAME[variant]} ${className}`}
      style={[variant === 'elevated' ? shadows.card : undefined, style]}
      {...rest}
    >
      {icon}
    </Pressable>
  );
}
