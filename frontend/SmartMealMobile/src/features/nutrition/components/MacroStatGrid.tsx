import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';

export interface MacroStatGridProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Thêm tiền tố "≈" khi số liệu đến từ AI Estimate (BR-061). */
  estimated?: boolean;
  className?: string;
}

// design/AISnap.dc.html, FoodDetail.dc.html, EditMealLog.dc.html — lưới 3 cột Protein/Carbs/Fat.
export function MacroStatGrid({
  proteinG,
  carbsG,
  fatG,
  estimated = false,
  className = '',
}: MacroStatGridProps) {
  const prefix = estimated ? '≈ ' : '';
  const items: { label: string; value: number }[] = [
    { label: 'Protein', value: proteinG },
    { label: 'Carbs', value: carbsG },
    { label: 'Fat', value: fatG },
  ];

  return (
    <View className={`flex-row gap-xs ${className}`}>
      {items.map(item => (
        <View key={item.label} className="flex-1 gap-xxs rounded-md bg-background p-sm">
          <AppText variant="caption" color="secondary">
            {item.label}
          </AppText>
          <AppText variant="h3">
            {prefix}
            {item.value}
            <AppText variant="caption" color="secondary">
              {' g'}
            </AppText>
          </AppText>
        </View>
      ))}
    </View>
  );
}
