import { UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/theme/ThemeProvider';
import type { RecommendedMeal } from '../types/dashboard.types';

export interface RecommendedMealCardProps {
  meal: RecommendedMeal;
}

// design/Dashboard.dc.html "Gợi ý bữa tối" — trỏ tới RecipeDetail.dc.html (Đợt 5 mới dựng),
// nên tạm hiển thị tĩnh, không điều hướng (TODO nối khi Đợt 5 xong — xem báo cáo Đợt 2).
export function RecommendedMealCard({ meal }: RecommendedMealCardProps) {
  const { colors } = useTheme();

  return (
    <View style={shadows.card} className="flex-row gap-sm rounded-card bg-surface p-sm">
      <View className="h-[96px] w-[112px] items-center justify-center rounded-md bg-primary-soft">
        <UtensilsCrossed size={26} color={colors.primary} />
      </View>
      <View className="justify-center gap-xs py-xxs">
        <AppText variant="bodyMedium">{meal.name}</AppText>
        <AppText variant="body" color="secondary">
          {`${meal.durationMinutes} phút · ${meal.calories} kcal`}
        </AppText>
        <AppBadge label={meal.tag} />
      </View>
    </View>
  );
}
