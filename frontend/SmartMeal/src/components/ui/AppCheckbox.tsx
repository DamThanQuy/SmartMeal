import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

export interface AppCheckboxProps
  extends Omit<PressableProps, 'children' | 'onPress'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Bắt buộc khi không có `label` (icon-only) — AppCheckbox luôn cần label mô tả cho a11y. */
  accessibilityLabel?: string;
  className?: string;
}

// UI primitive mới — chưa có trong danh sách gốc CLAUDE.md mục 7 (AppText/AppButton/
// AppIconButton/AppInput/AppCard/AppChip/AppBottomSheet) nhưng cần cho ô "Đồng ý điều khoản"
// (Register.dc.html) và sẽ tái dùng cho check-off Grocery (Đợt 6, design.md mục 35).
// Kích thước 22px theo đúng input checkbox trong design; vùng chạm mở rộng qua hitSlop để
// đạt tối thiểu 44px (typescript-mobile.md — Accessibility).
export function AppCheckbox({
  checked,
  onChange,
  label,
  accessibilityLabel,
  className = '',
  ...rest
}: AppCheckboxProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      className={`min-h-[44px] flex-row items-start gap-sm py-xs ${className}`}
      {...rest}
    >
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-sm border ${
          checked ? 'border-primary bg-primary' : 'border-border bg-surface'
        }`}
      >
        {checked ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
      </View>
      {label ? (
        <AppText variant="body" color="secondary" className="flex-1">
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}
