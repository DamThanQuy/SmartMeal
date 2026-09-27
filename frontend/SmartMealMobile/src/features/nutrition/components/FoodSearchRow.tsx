import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { FoodItem } from '../types/nutrition.types';

export interface FoodSearchRowProps {
  food: FoodItem;
  onPress: () => void;
  className?: string;
}

// design/FoodSearch.dc.html — row kết quả tìm món, dẫn sang FoodDetail để chọn serving (BR-052).
export function FoodSearchRow({ food, onPress, className = '' }: FoodSearchRowProps) {
  const { colors } = useTheme();
  const defaultServing =
    food.servingOptions.find(option => option.id === food.defaultServingId) ??
    food.servingOptions[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Thêm ${food.name}`}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center gap-sm border-t border-border py-sm ${className}`}
    >
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyLg">{food.name}</AppText>
        <View className="flex-row items-center gap-xxs">
          <AppText variant="body" color="secondary">
            {`${defaultServing?.label ?? ''} · ${food.nutritionPerServing.calories} kcal`}
          </AppText>
          {food.verified ? (
            <ShieldCheck size={14} color={colors.primary} accessibilityLabel="Dữ liệu đã xác minh" />
          ) : null}
        </View>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}
