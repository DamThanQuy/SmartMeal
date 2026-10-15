import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { AppCard, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { WeeklyProgressSummary } from '../types/nutrition.types';
import { MacroProgressList } from './MacroProgressList';

export interface RangeProgressViewProps {
  summary: WeeklyProgressSummary;
  /** Biểu đồ nhiều cột (tháng): cột mảnh, không ghi số trên đầu cột. */
  dense?: boolean;
}

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

// design/ProgressChart.dc.html — biểu đồ calo theo ngày + trung bình + số ngày đạt mục tiêu + macro
// trung bình. Dùng chung cho tab "Tuần" (7 cột) và "Tháng" (30 cột, `dense`).
export function RangeProgressView({ summary, dense = false }: RangeProgressViewProps) {
  const { colors } = useTheme();
  const loggedDays = summary.days.filter(day => day.calories > 0).length;

  return (
    <View className="gap-lg">
      <AppCard className="gap-sm">
        <View className="flex-row items-baseline justify-between">
          <AppText variant="h3">{`Calo · ${summary.rangeLabel}`}</AppText>
          <AppText variant="caption" color="secondary">
            {`Mục tiêu ${formatNumber(summary.calorieTarget)}`}
          </AppText>
        </View>

        <BarChart
          data={summary.days.map(day => ({
            value: day.calories,
            label: day.label,
            frontColor: day.calories > summary.calorieTarget ? colors.warning : colors.primary,
            labelTextStyle: {
              color: day.isToday ? colors.textPrimary : colors.textSecondary,
              fontWeight: day.isToday ? '700' : '400',
              fontSize: dense ? 10 : 12,
            },
            topLabelComponent: dense
              ? undefined
              : () => (
                  <AppText variant="caption" color="secondary" className="mb-xxs">
                    {formatNumber(day.calories)}
                  </AppText>
                ),
          }))}
          height={140}
          barWidth={dense ? 6 : 24}
          spacing={dense ? 4 : 20}
          initialSpacing={dense ? 4 : 12}
          endSpacing={dense ? 4 : 12}
          barBorderRadius={dense ? 3 : 6}
          hideYAxisText
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules
          disableScroll
          showReferenceLine1
          referenceLine1Position={summary.calorieTarget}
          referenceLine1Config={{
            color: colors.primary,
            dashWidth: 6,
            dashGap: 4,
            thickness: 1.5,
          }}
        />

        <View className="flex-row gap-md">
          <View className="flex-row items-center gap-xxs">
            <View className="h-[10px] w-[10px] rounded-sm bg-primary" />
            <AppText variant="caption" color="secondary">
              Trong mục tiêu
            </AppText>
          </View>
          <View className="flex-row items-center gap-xxs">
            <View className="h-[10px] w-[10px] rounded-sm bg-warning" />
            <AppText variant="caption" color="secondary">
              Vượt mục tiêu
            </AppText>
          </View>
        </View>
      </AppCard>

      <View className="flex-row gap-sm">
        <AppCard className="flex-1 gap-xxs">
          <AppText variant="caption" color="secondary">
            Trung bình / ngày
          </AppText>
          <AppText variant="h2">{`${formatNumber(summary.averageCalories)} kcal`}</AppText>
        </AppCard>
        <AppCard className="flex-1 gap-xxs">
          <AppText variant="caption" color="secondary">
            Ngày đạt mục tiêu
          </AppText>
          <AppText variant="h2">{`${summary.daysOnTarget} / ${dense ? loggedDays : summary.days.length}`}</AppText>
          {dense ? (
            <AppText variant="caption" color="secondary">
              {`trên ${loggedDays} ngày đã ghi`}
            </AppText>
          ) : null}
        </AppCard>
      </View>

      {summary.averageMacros.length > 0 ? (
        <AppCard className="gap-md">
          <AppText variant="h3">Macro trung bình</AppText>
          <MacroProgressList macros={summary.averageMacros} />
        </AppCard>
      ) : null}
    </View>
  );
}
