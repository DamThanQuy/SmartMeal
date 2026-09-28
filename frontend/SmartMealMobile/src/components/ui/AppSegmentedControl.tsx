import React from 'react';
import { Pressable, View } from 'react-native';
import { shadows } from '@/theme/shadows';
import { AppText } from './AppText';

export interface AppSegmentedControlOption<T extends string> {
  id: T;
  label: string;
}

export interface AppSegmentedControlProps<T extends string> {
  options: AppSegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// UI primitive mới — pill toggle "Thực đơn/Đi chợ" (design/MealPlanner.dc.html), tái dùng cho
// "1 tháng/3 tháng/1 năm" (design/WeightHistory.dc.html, Đợt 7). Không có trong danh sách gốc
// CLAUDE.md mục 7 nhưng cùng tinh thần AppChip — tách riêng vì đây là nhóm lựa chọn duy nhất
// (segmented, luôn có 1 giá trị chọn) khác với AppChip (có thể không chọn/multi-select).
export function AppSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: AppSegmentedControlProps<T>) {
  return (
    <View className={`flex-row gap-xxs rounded-lg bg-primary-soft p-xxs ${className}`}>
      {options.map(option => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={selected ? shadows.card : undefined}
            className={`h-[40px] flex-1 items-center justify-center rounded-md ${
              selected ? 'bg-surface' : 'bg-transparent'
            }`}
          >
            <AppText variant="bodyMedium" color={selected ? 'primary' : 'secondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
