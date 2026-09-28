import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import type { MacroTargetProgress } from '../types/nutrition.types';

export interface MacroProgressListProps {
  macros: MacroTargetProgress[];
  className?: string;
}

// design/design.md mục 17 (Macro Card) — dùng chung cho Dashboard (Macro Card) và
// ProgressChart (Macro trung bình). Không dùng 3 màu sặc sỡ, chỉ 1 tone primary.
export function MacroProgressList({ macros, className = '' }: MacroProgressListProps) {
  return (
    <View className={`gap-sm ${className}`}>
      {macros.map(macro => {
        const percent = macro.targetG > 0 ? Math.min(macro.consumedG / macro.targetG, 1) : 0;
        return (
          <View key={macro.label} className="gap-xxs">
            <View className="flex-row items-baseline justify-between">
              <AppText variant="bodyMedium">{macro.label}</AppText>
              <AppText variant="caption" color="secondary">
                <AppText variant="bodyMedium">{macro.consumedG}</AppText>
                {` / ${macro.targetG}g`}
              </AppText>
            </View>
            <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
              <View
                className="h-[8px] rounded-pill bg-primary"
                style={{ width: `${percent * 100}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
