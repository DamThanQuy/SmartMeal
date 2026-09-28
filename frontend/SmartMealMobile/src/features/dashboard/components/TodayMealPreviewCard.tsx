import { UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/theme/ThemeProvider';

export interface TodayMealPreviewCardProps {
  mealTitle: string;
  foodNames: string;
  calories: number;
  macroLine: string;
  onPress: () => void;
}

// design/design.md mục 19 (Meal Card) + Dashboard.dc.html "Bữa ăn hôm nay" — ảnh món chiếm
// ~35–45% card (dùng placeholder icon, ảnh thật sẽ thay sau — CLAUDE.md mục 10).
export function TodayMealPreviewCard({
  mealTitle,
  foodNames,
  calories,
  macroLine,
  onPress,
}: TodayMealPreviewCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mealTitle}: ${foodNames}`}
      onPress={onPress}
      style={shadows.card}
      className="flex-row gap-sm rounded-card bg-surface p-sm"
    >
      <View className="h-[104px] w-[124px] items-center justify-center rounded-md bg-primary-soft">
        <UtensilsCrossed size={28} color={colors.primary} />
      </View>
      <View className="flex-1 justify-center gap-xxs py-xxs">
        <AppText variant="caption" color="secondary">
          {mealTitle}
        </AppText>
        <AppText variant="bodyMedium">{foodNames}</AppText>
        <AppText variant="h3" color="onPrimarySoft">{`${calories} kcal`}</AppText>
        <AppText variant="caption" color="secondary">
          {macroLine}
        </AppText>
      </View>
    </Pressable>
  );
}
