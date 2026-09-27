import React from 'react';
import { View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import { AppCard, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface CalorieRingCardProps {
  consumedCalories: number;
  calorieTarget: number;
  activityCalories: number;
  className?: string;
}

const RING_SIZE = 140;
const RING_RADIUS = 58;
const RING_STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

// design/Dashboard.dc.html mục 16 (Daily Calorie Card) — chỉ hiển thị Calories/Remaining làm
// thông tin chính, không nhồi thêm chỉ số khác vào card này (macro nằm ở card riêng).
export function CalorieRingCard({
  consumedCalories,
  calorieTarget,
  activityCalories,
  className = '',
}: CalorieRingCardProps) {
  const { colors } = useTheme();
  const effectiveTarget = calorieTarget + activityCalories;
  const remaining = effectiveTarget - consumedCalories;
  const percent = effectiveTarget > 0 ? Math.min(consumedCalories / effectiveTarget, 1) : 0;

  return (
    <AppCard className={`flex-row items-center gap-md ${className}`}>
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.primarySoft}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.primary}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE * percent} ${CIRCUMFERENCE}`}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center gap-xxs">
          <AppText variant="h2">{formatNumber(consumedCalories)}</AppText>
          <AppText variant="caption" color="secondary">
            kcal đã nạp
          </AppText>
        </View>
      </View>

      <View className="flex-1 gap-sm">
        <View>
          <AppText variant="h2" color="onPrimarySoft">
            {formatNumber(Math.max(remaining, 0))}
          </AppText>
          <AppText variant="body" color="secondary">
            kcal còn lại
          </AppText>
        </View>
        <View className="h-[1px] bg-border" />
        <View className="flex-row justify-between">
          <AppText variant="caption" color="secondary">
            Mục tiêu
          </AppText>
          <AppText variant="bodyMedium">{formatNumber(calorieTarget)}</AppText>
        </View>
        <View className="flex-row justify-between">
          <AppText variant="caption" color="secondary">
            + Vận động
          </AppText>
          <AppText variant="bodyMedium">{formatNumber(activityCalories)}</AppText>
        </View>
      </View>
    </AppCard>
  );
}
