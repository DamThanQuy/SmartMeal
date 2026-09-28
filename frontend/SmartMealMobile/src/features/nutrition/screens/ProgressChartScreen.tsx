import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppCard, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { MacroProgressList } from '../components/MacroProgressList';
import { useWeeklyProgress } from '../hooks/useProgress';
import { todayIso } from '../services/nutritionService';

type Props = NativeStackScreenProps<MainStackParamList, 'ProgressChart'>;

type Period = 'day' | 'week' | 'month';

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
];

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

// design/ProgressChart.dc.html (BR-050). Chỉ đợt "Tuần" có dữ liệu mock 7 ngày theo yêu cầu
// Phase 3 (docs/ui-mock-prompts.md) — "Ngày"/"Tháng" chưa có nguồn dữ liệu, hiện EmptyState.
export function ProgressChartScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('week');
  const dateIso = todayIso();
  const { data: summary, isLoading, isError, error, refetch } = useWeeklyProgress(dateIso);

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Tiến độ dinh dưỡng" onBack={() => navigation.goBack()} />

      <View className="mb-lg flex-row gap-xxs rounded-md bg-primary-soft p-xxs">
        {PERIOD_OPTIONS.map(option => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: period === option.id }}
            onPress={() => setPeriod(option.id)}
            className={`h-[40px] flex-1 items-center justify-center rounded-sm ${
              period === option.id ? 'bg-surface' : 'bg-transparent'
            }`}
          >
            <AppText
              variant="bodyMedium"
              color={period === option.id ? 'primary' : 'secondary'}
            >
              {option.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingState lines={6} />
      ) : isError ? (
        <ErrorState description={error.message} onRetry={refetch} />
      ) : period !== 'week' ? (
        <EmptyState
          title="Chưa hỗ trợ"
          description={`Xem tiến độ theo ${period === 'day' ? 'Ngày' : 'Tháng'} sẽ có ở đợt sau.`}
        />
      ) : summary ? (
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
                  fontSize: 12,
                },
                topLabelComponent: () => (
                  <AppText variant="caption" color="secondary" className="mb-xxs">
                    {formatNumber(day.calories)}
                  </AppText>
                ),
              }))}
              height={140}
              barWidth={24}
              spacing={20}
              initialSpacing={12}
              endSpacing={12}
              barBorderRadius={6}
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
              <AppText variant="h2">{`${summary.daysOnTarget} / ${summary.days.length}`}</AppText>
            </AppCard>
          </View>

          <AppCard className="gap-md">
            <AppText variant="h3">Macro trung bình</AppText>
            <MacroProgressList
              macros={summary.averageMacros.map(macro => ({
                label: macro.label,
                consumedG: macro.consumedG,
                targetG: macro.targetG,
              }))}
            />
          </AppCard>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
