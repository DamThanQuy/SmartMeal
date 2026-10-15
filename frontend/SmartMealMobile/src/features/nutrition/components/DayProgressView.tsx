import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { AppCard, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { DayProgressSummary } from '../types/nutrition.types';
import { MacroProgressList } from './MacroProgressList';

export interface DayProgressViewProps {
  summary: DayProgressSummary;
}

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

// Tab "Ngày" của ProgressChart: calo từng bữa hôm nay so với ngân sách + macro so với mục tiêu.
export function DayProgressView({ summary }: DayProgressViewProps) {
  const { colors } = useTheme();
  const remaining = summary.calorieBudget - summary.totalCalories;

  return (
    <View className="gap-lg">
      <AppCard className="gap-sm">
        <View className="flex-row items-baseline justify-between">
          <AppText variant="h3">Calo theo bữa · Hôm nay</AppText>
          <AppText variant="caption" color="secondary">
            {`Ngân sách ${formatNumber(summary.calorieBudget)}`}
          </AppText>
        </View>

        <BarChart
          data={summary.meals.map(meal => ({
            value: meal.calories,
            label: meal.label,
            frontColor: colors.primary,
            labelTextStyle: { color: colors.textSecondary, fontSize: 12 },
            topLabelComponent: () => (
              <AppText variant="caption" color="secondary" className="mb-xxs">
                {formatNumber(meal.calories)}
              </AppText>
            ),
          }))}
          height={140}
          barWidth={40}
          spacing={32}
          initialSpacing={16}
          endSpacing={16}
          barBorderRadius={6}
          hideYAxisText
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules
          disableScroll
        />
      </AppCard>

      <View className="flex-row gap-sm">
        <AppCard className="flex-1 gap-xxs">
          <AppText variant="caption" color="secondary">
            Đã nạp
          </AppText>
          <AppText variant="h2">{`${formatNumber(summary.totalCalories)} kcal`}</AppText>
        </AppCard>
        <AppCard className="flex-1 gap-xxs">
          <AppText variant="caption" color="secondary">
            {remaining >= 0 ? 'Còn lại' : 'Vượt ngân sách'}
          </AppText>
          <AppText variant="h2" color={remaining >= 0 ? 'success' : 'warning'}>
            {`${formatNumber(Math.abs(remaining))} kcal`}
          </AppText>
        </AppCard>
      </View>

      <AppCard className="gap-md">
        <AppText variant="h3">Macro hôm nay</AppText>
        <MacroProgressList macros={summary.macros} />
      </AppCard>
    </View>
  );
}
