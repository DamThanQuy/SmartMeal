import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';

export interface MacroStatGridProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Thêm tiền tố "≈" khi số liệu đến từ AI Estimate (BR-061). */
  estimated?: boolean;
  /** Dashboard dùng ba ô tổng quan và phần trăm mục tiêu. */
  targets?: { proteinG: number; carbsG: number; fatG: number };
  className?: string;
}

// design/AISnap.dc.html, FoodDetail.dc.html, EditMealLog.dc.html — lưới 3 cột Protein/Carbs/Fat.
export function MacroStatGrid({
  proteinG,
  carbsG,
  fatG,
  estimated = false,
  targets,
  className = '',
}: MacroStatGridProps) {
  const prefix = estimated ? '≈ ' : '';
  const items = [
    {
      label: targets ? 'Đạm' : 'Protein',
      value: proteinG,
      target: targets?.proteinG,
    },
    {
      label: targets ? 'Tinh bột' : 'Carbs',
      value: carbsG,
      target: targets?.carbsG,
    },
    { label: targets ? 'Chất béo' : 'Fat', value: fatG, target: targets?.fatG },
  ];

  return (
    <View className={`flex-row gap-xs ${className}`}>
      {items.map(item => (
        <View
          key={item.label}
          className={`flex-1 gap-xxs p-sm ${targets ? 'rounded-card border border-border bg-surface' : 'rounded-md bg-background'}`}
        >
          <AppText variant="caption" color="secondary">
            {item.label}
          </AppText>
          <AppText variant="h3">
            {prefix}
            {targets ? Math.round(item.value * 10) / 10 : item.value}
            <AppText
              variant={targets ? 'bodyMedium' : 'caption'}
              color={targets ? 'primary' : 'secondary'}
            >
              {' g'}
            </AppText>
          </AppText>
          {targets ? (
            <AppText
              variant="caption"
              color="onPrimarySoft"
              className="font-sans-semibold"
            >
              {item.target && item.target > 0
                ? Math.round((item.value / item.target) * 100)
                : 0}
              %
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}
