import { ArrowLeftRight, Plus, UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIconButton, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { PlannedMealSlot } from '../types/mealPlanner.types';

export interface MealSlotSectionProps {
  mealTitle: string;
  slot: PlannedMealSlot | null;
  onPressChange: () => void;
  onPressDetail?: () => void;
  className?: string;
}

// design/MealPlanner.dc.html (docs/design.md mục 34 — Meal Planner Card): mỗi bữa 1 section,
// slot đã chọn hiện "Đổi món", slot trống hiện nút viền nét đứt "Thêm món".
export function MealSlotSection({
  mealTitle,
  slot,
  onPressChange,
  onPressDetail,
  className = '',
}: MealSlotSectionProps) {
  const { colors } = useTheme();

  return (
    <View className={`gap-sm ${className}`}>
      <AppText variant="bodyMedium" color="secondary">
        {mealTitle}
      </AppText>
      {slot ? (
        <View className="flex-row items-center gap-sm">
          <Pressable
            className="flex-1 flex-row items-center gap-sm"
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết ${slot.recipeName}`}
            onPress={onPressDetail}
          >
            <View className="h-[56px] w-[56px] items-center justify-center rounded-md bg-primary-soft">
              <UtensilsCrossed size={20} color={colors.primary} />
            </View>
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyLg" numberOfLines={1}>
                {slot.recipeName}
              </AppText>
              <AppText variant="caption" color="secondary">
                {`${slot.durationMinutes} phút · ${slot.calories} kcal`}
              </AppText>
            </View>
          </Pressable>
          <AppIconButton
            accessibilityLabel={`Đổi món ${slot.recipeName}`}
            icon={<ArrowLeftRight size={20} color={colors.textSecondary} />}
            onPress={onPressChange}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Thêm món cho ${mealTitle}`}
          onPress={onPressChange}
          className="h-[48px] flex-row items-center justify-center gap-xs rounded-md border border-dashed border-border"
        >
          <Plus size={18} color={colors.primary} />
          <AppText variant="bodyMedium" color="primary">
            Thêm món
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
