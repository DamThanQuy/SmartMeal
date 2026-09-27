import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

export type LoadingStateVariant = 'skeleton' | 'spinner';

export interface LoadingStateProps {
  variant?: LoadingStateVariant;
  /** Số dòng skeleton hiển thị (chỉ dùng khi variant="skeleton"). */
  lines?: number;
  className?: string;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`rounded-md bg-skeleton ${className}`}
    />
  );
}

// docs/design.md mục 51 — ưu tiên skeleton cho Recipe list/Dashboard/Meal plan/Grocery list,
// không để màn hình trắng khi loading.
export function LoadingState({
  variant = 'skeleton',
  lines = 3,
  className = '',
}: LoadingStateProps) {
  const { colors } = useTheme();

  if (variant === 'spinner') {
    return (
      <View
        className={`flex-1 items-center justify-center ${className}`}
        accessibilityRole="progressbar"
        accessibilityLabel="Đang tải"
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      className={`gap-sm p-md ${className}`}
      accessibilityRole="progressbar"
      accessibilityLabel="Đang tải"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLine
          key={index}
          className={index === lines - 1 ? 'h-[16px] w-2/3' : 'h-[16px] w-full'}
        />
      ))}
    </View>
  );
}
