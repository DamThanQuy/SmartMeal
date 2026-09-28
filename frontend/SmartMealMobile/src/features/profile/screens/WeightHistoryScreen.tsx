import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, subMonths } from 'date-fns';
import { Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { EmptyState, InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import {
  AppBottomSheet,
  AppButton,
  AppCard,
  AppInput,
  AppSegmentedControl,
  AppText,
} from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'WeightHistory'>;

type RangeOption = '1m' | '3m' | '1y';

const RANGE_OPTIONS: { id: RangeOption; label: string; months: number }[] = [
  { id: '1m', label: '1 tháng', months: 1 },
  { id: '3m', label: '3 tháng', months: 3 },
  { id: '1y', label: '1 năm', months: 12 },
];

function formatWeight(weightKg: number): string {
  return weightKg.toLocaleString('vi-VN', { minimumFractionDigits: weightKg % 1 === 0 ? 0 : 1 });
}

// design/WeightHistory.dc.html (BR-001→BR-003). Ghi cân nặng mới đi qua đúng 1 công thức
// (calculateHealthProfileResult, features/health) qua userProfileStore.recordWeight — không
// định nghĩa lại BMI/BMR/TDEE ở đây (no-hardcode.md mục 5).
export function WeightHistoryScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const profile = useUserProfileStore();
  const [range, setRange] = useState<RangeOption>('3m');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const rangeMonths = RANGE_OPTIONS.find(option => option.id === range)?.months ?? 3;
  const cutoff = subMonths(new Date(), rangeMonths);
  const historyInRange = profile.weightHistory.filter(entry => new Date(entry.dateIso) >= cutoff);
  const sortedAscending = [...historyInRange].sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const oldestInRange = sortedAscending[0];
  const deltaKg = oldestInRange ? profile.weightKg - oldestInRange.weightKg : 0;

  const handleSubmitWeight = () => {
    const weightKg = Number(weightInput.replace(',', '.'));
    if (!weightKg || weightKg <= 0) return;
    profile.recordWeight(weightKg, format(new Date(), 'yyyy-MM-dd'));
    setWeightInput('');
    setSheetVisible(false);
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Cân nặng" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-sm"
      >
        <AppSegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />

        <AppCard className="gap-sm">
          <View className="flex-row items-baseline justify-between">
            <AppText variant="h1">{`${formatWeight(profile.weightKg)} kg`}</AppText>
            {oldestInRange ? (
              <AppText variant="bodyMedium" color={deltaKg <= 0 ? 'success' : 'warning'}>
                {`${deltaKg > 0 ? '+' : ''}${formatWeight(deltaKg)} kg / ${
                  RANGE_OPTIONS.find(option => option.id === range)?.label
                }`}
              </AppText>
            ) : null}
          </View>

          {sortedAscending.length > 1 ? (
            <LineChart
              data={sortedAscending.map(entry => ({ value: entry.weightKg }))}
              height={120}
              curved
              color={colors.primary}
              thickness={3}
              hideDataPoints={false}
              dataPointsColor={colors.primary}
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              disableScroll
              initialSpacing={8}
              endSpacing={8}
            />
          ) : null}

          <View className="flex-row justify-between">
            <AppText variant="caption" color="secondary">
              {sortedAscending[0] ? format(new Date(sortedAscending[0].dateIso), 'MM/yyyy') : ''}
            </AppText>
            <AppText variant="caption" color="secondary">
              {`Mục tiêu ${formatWeight(profile.goalWeightKg)} kg`}
            </AppText>
          </View>
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3" className="mb-xxs">
            Lịch sử
          </AppText>
          {profile.weightHistory.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Ghi cân nặng đầu tiên của bạn." />
          ) : (
            profile.weightHistory.map((entry, index) => {
              const previous = profile.weightHistory[index + 1];
              const entryDelta = previous ? entry.weightKg - previous.weightKg : 0;
              return (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between border-t border-border py-xs"
                >
                  <AppText variant="caption" color="secondary">
                    {format(new Date(entry.dateIso), 'dd/MM/yyyy')}
                  </AppText>
                  <View className="flex-row items-center gap-sm">
                    {previous ? (
                      <AppText variant="caption" color={entryDelta <= 0 ? 'success' : 'warning'}>
                        {`${entryDelta > 0 ? '+' : ''}${formatWeight(entryDelta)}`}
                      </AppText>
                    ) : null}
                    <AppText variant="bodyMedium">{`${formatWeight(entry.weightKg)} kg`}</AppText>
                  </View>
                </View>
              );
            })
          )}
        </AppCard>

        <InlineBanner
          tone="neutral"
          icon={<Info size={20} color={colors.info} />}
          description="Ghi cân nặng mới sẽ tính lại BMI, TDEE và mục tiêu calo mỗi ngày."
        />
      </ScrollView>

      <View className="py-md">
        <AppButton
          label="Ghi cân nặng"
          onPress={() => setSheetVisible(true)}
        />
      </View>

      <AppBottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View className="gap-md">
          <AppText variant="h3">Ghi cân nặng hôm nay</AppText>
          <AppInput
            label="Cân nặng (kg)"
            keyboardType="decimal-pad"
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder={formatWeight(profile.weightKg)}
            rightAdornment={<AppText color="secondary">kg</AppText>}
          />
          <AppButton label="Lưu" onPress={handleSubmitWeight} />
        </View>
      </AppBottomSheet>
    </ScreenContainer>
  );
}
