import React, { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

export interface AppInputProps extends Omit<TextInputProps, 'className'> {
  label?: string;
  error?: string;
  /** Icon trái (email/lock/user...) — docs/design.md mục 41, lặp lại ở hầu hết input Auth/Health. */
  leftIcon?: React.ReactNode;
  /** Nội dung phải trong input (vd. đơn vị "kg") — design/HealthProfile.dc.html. */
  rightAdornment?: React.ReactNode;
  className?: string;
}

// docs/design.md mục 41 (Input) — height 48, radius 12, border mặc định/focus/error.
export function AppInput({
  label,
  error,
  leftIcon,
  rightAdornment,
  className = '',
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  // placeholderTextColor là native prop, không style qua className được -> lấy từ useTheme().
  const { colors } = useTheme();

  const borderClassName = error
    ? 'border-error'
    : isFocused
    ? 'border-border-focus'
    : 'border-border';

  return (
    <View className="gap-xs">
      {label ? (
        <AppText variant="bodyMedium" color="secondary">
          {label}
        </AppText>
      ) : null}
      <View className="relative justify-center">
        {leftIcon ? (
          <View className="absolute left-md z-10">{leftIcon}</View>
        ) : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          onFocus={event => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className={`h-[48px] rounded-md border bg-surface font-sans text-body text-text-primary ${
            leftIcon ? 'pl-[44px]' : 'pl-md'
          } ${rightAdornment ? 'pr-[44px]' : 'pr-md'} ${borderClassName} ${className}`}
          {...rest}
        />
        {rightAdornment ? (
          <View className="absolute right-md z-10">{rightAdornment}</View>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
