import { Plus, UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppButton, AppCard, AppIconButton, AppText } from '@/components/ui';
import { MEAL_TYPE_TITLES, type MealType } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import type { MealLogEntry } from '../types/nutrition.types';
import { sumNutrition } from '../utils/nutritionMath';
import { DiaryFoodRow } from './DiaryFoodRow';

export interface DiaryMealSectionProps {
  mealType: MealType;
  entries: MealLogEntry[];
  onAdd: () => void;
  onEditEntry: (logId: string) => void;
  /** Id các MealLogEntry còn "Chờ đồng bộ" (StateOffline.dc.html, BR-261). */
  pendingSyncIds?: Set<string>;
}

// design/Diary.dc.html — 1 card / bữa ăn, có Empty state riêng (design.md mục 20) khi chưa
// ghi món nào cho bữa đó.
export function DiaryMealSection({
  mealType,
  entries,
  onAdd,
  onEditEntry,
  pendingSyncIds,
}: DiaryMealSectionProps) {
  const { colors } = useTheme();
  const mealTitle = MEAL_TYPE_TITLES[mealType];

  if (entries.length === 0) {
    return (
      <AppCard className="items-center gap-sm py-lg">
        <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-soft">
          <UtensilsCrossed size={26} color={colors.primary} />
        </View>
        <AppText variant="bodyMedium">{`Chưa có ${mealTitle.toLowerCase()}`}</AppText>
        <AppText variant="body" color="secondary" className="text-center">
          Thêm món ăn để bắt đầu theo dõi dinh dưỡng.
        </AppText>
        <AppButton label={`Ghi ${mealTitle.toLowerCase()}`} onPress={onAdd} className="mt-xs" />
      </AppCard>
    );
  }

  const totalCalories = sumNutrition(entries.map(entry => entry.nutrition)).calories;

  return (
    <AppCard className="gap-0">
      <View className="flex-row items-center gap-xs pb-sm">
        <AppText variant="h3" className="flex-1">
          {mealTitle}
        </AppText>
        <AppText variant="body" color="secondary">
          {`${totalCalories} kcal`}
        </AppText>
        <AppIconButton
          accessibilityLabel={`Thêm vào ${mealTitle}`}
          variant="soft"
          icon={<Plus size={20} color={colors.primary} />}
          onPress={onAdd}
        />
      </View>
      {entries.map(entry => (
        <DiaryFoodRow
          key={entry.id}
          entry={entry}
          onPress={() => onEditEntry(entry.id)}
          pendingSync={pendingSyncIds?.has(entry.id)}
        />
      ))}
    </AppCard>
  );
}
