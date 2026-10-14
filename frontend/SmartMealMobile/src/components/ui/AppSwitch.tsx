import React, { useEffect } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { shadows } from '@/theme/shadows';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export interface AppSwitchProps extends Omit<PressableProps, 'children' | 'onPress' | 'disabled'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Bắt buộc — switch không có text hiển thị nên luôn cần accessibilityLabel. */
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
}

// UI primitive mới — toggle bật/tắt (design/HealthConnect.dc.html, Reminders.dc.html,
// Notifications.dc.html — Đợt 7), chưa có trong danh sách gốc CLAUDE.md mục 7. Kích thước
// 48×28 theo đúng design; vùng chạm mở rộng qua hitSlop để đạt tối thiểu 44px, cùng cách làm
// với AppCheckbox (components/ui/AppCheckbox.tsx).
export function AppSwitch({
  checked,
  onChange,
  accessibilityLabel,
  disabled = false,
  className = '',
  ...rest
}: AppSwitchProps) {
  const thumbTranslateX = useSharedValue(0);
  const thumbScale = useSharedValue(1);

  // Animate thumb translate and scale based on checked state.
  useEffect(() => {
    thumbTranslateX.value = withTiming(checked ? 22 : 0, { duration: 140 });
    thumbScale.value = withSpring(checked ? 1.05 : 1, { damping: 12 });
  }, [checked, thumbTranslateX, thumbScale]);

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbTranslateX.value },
      { scale: thumbScale.value },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      className={`h-[28px] w-[48px] flex-row rounded-full p-[3px] ${
        checked ? 'bg-primary' : 'bg-border'
      } ${disabled ? 'opacity-40' : ''} ${className}`}
      style={{ alignItems: 'center' }}
      {...rest}
    >
      <Animated.View
        className="h-[22px] w-[22px] rounded-full bg-surface"
        style={[shadows.card, animatedThumbStyle]}
      />
    </Pressable>
  );
}
