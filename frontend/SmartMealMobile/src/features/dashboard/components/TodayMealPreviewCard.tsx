import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { RecipeImage } from '@/features/recipes';
import { shadows } from '@/theme/shadows';

export interface TodayMealPreviewCardProps {
  mealTitle: string;
  foodNames: string;
  calories: number;
  macroLine: string;
  /** Ảnh món đã chụp (AI Snap) backend lưu; không có thì hiện placeholder icon. */
  imageUrl?: string;
  onPress: () => void;
}

// design/design.md mục 19 (Meal Card) + Dashboard.dc.html "Bữa ăn hôm nay" — ảnh món chiếm
// ~35–45% card: ảnh đã chụp khi ghi bằng AI Snap, chưa có ảnh thì placeholder icon (CLAUDE.md mục 10).
export function TodayMealPreviewCard({
  mealTitle,
  foodNames,
  calories,
  macroLine,
  imageUrl,
  onPress,
}: TodayMealPreviewCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mealTitle}: ${foodNames}`}
      onPress={onPress}
      style={shadows.card}
      className="flex-row gap-sm rounded-card bg-surface p-sm"
    >
      <RecipeImage
        imageUrl={imageUrl}
        accessibilityLabel={`Ảnh ${mealTitle.toLowerCase()}`}
        className="h-[104px] w-[124px] rounded-md"
      />
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
