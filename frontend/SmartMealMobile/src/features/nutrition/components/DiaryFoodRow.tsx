import { ChevronRight, Clock, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { MealLogEntry } from '../types/nutrition.types';

export interface DiaryFoodRowProps {
  entry: MealLogEntry;
  onPress: () => void;
  /** true khi món này còn trong hàng đợi offline (StateOffline.dc.html, BR-261). */
  pendingSync?: boolean;
  className?: string;
}

// design/Diary.dc.html + StateOffline.dc.html — row món trong 1 bữa, tap để sửa (EditMealLog,
// BR-053). Badge "Chờ đồng bộ" hiện khi món vừa ghi lúc đang mô phỏng offline.
export function DiaryFoodRow({ entry, onPress, pendingSync = false, className = '' }: DiaryFoodRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sửa ${entry.foodName}`}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center gap-sm border-t border-border py-sm ${className}`}
    >
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyLg">{entry.foodName}</AppText>
        <View className="flex-row items-center gap-xxs">
          <AppText variant="body" color="secondary">
            {entry.servingLabel}
          </AppText>
          {entry.aiConfirmed ? (
            <AppBadge label="AI · đã xác nhận" icon={<Sparkles size={12} color={colors.onPrimarySoft} />} />
          ) : null}
          {pendingSync ? (
            <AppBadge label="Chờ đồng bộ" tone="info" icon={<Clock size={12} color={colors.infoText} />} />
          ) : null}
        </View>
      </View>
      <AppText variant="bodyMedium">{`${entry.nutrition.calories} kcal`}</AppText>
      <ChevronRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}
