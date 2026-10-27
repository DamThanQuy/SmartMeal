import React from 'react';
import { View } from 'react-native';
import { AppChip } from '@/components/ui';
import { MEAL_TYPE_OPTIONS, type MealType } from '@/types/meal.types';

export interface MealTypeChipsProps {
  value: MealType;
  onChange: (mealType: MealType) => void;
  className?: string;
}

// Chọn bữa Sáng/Trưa/Tối/Phụ (BR-051) — dùng chung ở Ghi bữa ăn, chi tiết món và màn xác nhận kết quả AI.
export function MealTypeChips({
  value,
  onChange,
  className = '',
}: MealTypeChipsProps) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Chọn bữa"
      className={`flex-row flex-wrap gap-xs ${className}`}
    >
      {MEAL_TYPE_OPTIONS.map(option => (
        <AppChip
          key={option.id}
          label={option.label}
          selected={value === option.id}
          onPress={() => onChange(option.id)}
        />
      ))}
    </View>
  );
}
