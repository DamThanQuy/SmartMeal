import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { DayProgressView } from '../components/DayProgressView';
import { RangeProgressView } from '../components/RangeProgressView';
import { useDiaryDay } from '../hooks/useDiary';
import { useMonthlyProgress, useWeeklyProgress } from '../hooks/useProgress';
import { todayIso } from '../services/nutritionService';
import { buildDayProgress } from '../utils/progress';

type Props = NativeStackScreenProps<MainStackParamList, 'ProgressChart'>;

type Period = 'day' | 'week' | 'month';

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
];

// design/ProgressChart.dc.html (BR-050). "Ngày" tính từ nhật ký hôm nay (GET /nutritiondiary/daily),
// "Tuần" 7 ngày (GET /nutritiondiary/weekly-progress), "Tháng" 30 ngày (GET /nutritiondiary/progress).
export function ProgressChartScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const dateIso = todayIso();
  const diary = useDiaryDay(dateIso);
  const weekly = useWeeklyProgress(dateIso, period === 'week');
  const monthly = useMonthlyProgress(dateIso, period === 'month');
  const daySummary = useMemo(() => (diary.data ? buildDayProgress(diary.data) : null), [diary.data]);

  const active = period === 'day' ? diary : period === 'week' ? weekly : monthly;

  const renderContent = () => {
    if (active.isLoading) return <LoadingState lines={6} />;
    if (active.isError) {
      return <ErrorState description={active.error?.message} onRetry={() => void active.refetch()} />;
    }
    if (period === 'day') {
      if (!daySummary) return null;
      return daySummary.totalCalories > 0 ? (
        <DayProgressView summary={daySummary} />
      ) : (
        <EmptyState
          title="Hôm nay chưa ghi món nào"
          description="Ghi bữa ăn trong Nhật ký để xem calo theo bữa và macro của ngày."
        />
      );
    }
    const summary = period === 'week' ? weekly.data : monthly.data;
    return summary ? <RangeProgressView summary={summary} dense={period === 'month'} /> : null;
  };

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

      {renderContent()}
    </ScreenContainer>
  );
}
