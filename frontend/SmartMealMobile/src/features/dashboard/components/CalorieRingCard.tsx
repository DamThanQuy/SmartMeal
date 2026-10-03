import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface CalorieRingCardProps {
  consumedCalories: number;
  calorieTarget: number;
  activityCalories: number;
  onPress?: () => void;
  className?: string;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('vi-VN');
}

export function CalorieRingCard({
  consumedCalories,
  calorieTarget,
  activityCalories,
  onPress,
  className = '',
}: CalorieRingCardProps) {
  const { colors } = useTheme();
  const effectiveTarget = calorieTarget + activityCalories;
  const remaining = effectiveTarget - consumedCalories;
  const percent =
    effectiveTarget > 0
      ? Math.max(0, Math.min(consumedCalories / effectiveTarget, 1))
      : 0;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Năng lượng hôm nay: ${formatNumber(consumedCalories)} trên ${formatNumber(effectiveTarget)} kcal. Xem ngân sách calo`}
      onPress={onPress}
      className={`overflow-hidden rounded-lg active:opacity-90 ${className}`}
    >
      <LinearGradient
        colors={[colors.energyStart, colors.energyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="gap-sm p-lg">
          <View className="flex-row items-center justify-between gap-sm">
            <View className="flex-1 gap-xxs">
              <AppText
                variant="caption"
                color="onEnergy"
                className="font-sans-semibold opacity-80"
              >
                NĂNG LƯỢNG HÔM NAY
              </AppText>
              <View className="flex-row flex-wrap items-baseline gap-xs">
                <AppText variant="display" color="onEnergy">
                  {formatNumber(consumedCalories)}
                </AppText>
                <AppText variant="body" color="onEnergy" className="opacity-80">
                  {`/ ${formatNumber(effectiveTarget)} kcal`}
                </AppText>
              </View>
            </View>
            <Flame size={32} strokeWidth={1.8} color={colors.onEnergy} />
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Tiến độ năng lượng hôm nay"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(percent * 100),
            }}
            className="h-[8px] overflow-hidden rounded-pill bg-energy-track"
          >
            <View
              className="h-full rounded-pill bg-energy-fill"
              style={{ width: `${percent * 100}%` }}
            />
          </View>
          <AppText variant="caption" color="onEnergy" className="opacity-80">
            {remaining >= 0
              ? `Còn ${formatNumber(remaining)} kcal cho mục tiêu hôm nay`
              : `Đã vượt ${formatNumber(-remaining)} kcal so với mục tiêu hôm nay`}
          </AppText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
