import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends PressableProps {
  /** Scale khi đang nhấn, giúp nút/card phản hồi chạm mềm và có chiều sâu hơn. */
  pressScale?: number;
  /** Độ nảy khi nhả tay; damping thấp sẽ mềm mại hơn. */
  pressDamping?: number;
  /** Stiffness cho phép scale return; số cao hơn = bật về nhanh hơn. */
  pressStiffness?: number;
}

/**
 * Pressable có micro-animation khi chạm/hover.
 *
 * Dùng cho AppButton/AppChip/AppIconButton/card pressable để tạo cảm giác "alive"
 * mà không đổi layout hay style hệ thống.
 */
export function AnimatedPressable({
  pressScale = 0.965,
  pressDamping = 16,
  pressStiffness = 320,
  style,
  children,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    transformOrigin: 'center center',
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableBase
      {...rest}
      onPressIn={event => {
        scale.value = withSpring(pressScale, { damping: pressDamping, stiffness: pressStiffness });
        opacity.value = withSpring(0.92, { damping: 18, stiffness: 260 });
        onPressIn?.(event);
      }}
      onPressOut={event => {
        scale.value = withSpring(1, { damping: pressDamping + 4, stiffness: pressStiffness + 80 });
        opacity.value = withSpring(1, { damping: 18, stiffness: 260 });
        onPressOut?.(event);
      }}
      onHoverIn={event => {
        scale.value = withSpring(1.015, { damping: 20, stiffness: 240 });
        opacity.value = withSpring(0.96, { damping: 20, stiffness: 240 });
        onHoverIn?.(event);
      }}
      onHoverOut={event => {
        scale.value = withSpring(1, { damping: 20, stiffness: 240 });
        opacity.value = withSpring(1, { damping: 20, stiffness: 240 });
        onHoverOut?.(event);
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
