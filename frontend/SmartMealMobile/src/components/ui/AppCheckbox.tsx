import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
  const checkScale = useSharedValue(0.8);

  // Animate check scale based on checked state.
  if (checked && checkScale.value < 1) {
    checkScale.value = withSpring(1, { damping: 12 });
  } else if (!checked && checkScale.value > 0.8) {
    checkScale.value = withTiming(0.8, { duration: 100 });
  }

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

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
        className={`h-[22px] w-[22px] items-center justify-center rounded-full border ${
          checked ? 'border-primary bg-primary' : 'border-border bg-surface'
        }`}
      >
        {checked ? (
          <Animated.View style={animatedCheckStyle} className="items-center justify-center">
            <Check size={14} color={colors.onPrimary} strokeWidth={3} />
          </Animated.View>
        ) : null}
      </View>
      {label ? (
        <AppText variant="body" color="secondary" className="flex-1">
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}
