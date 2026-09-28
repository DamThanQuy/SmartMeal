import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Droplet, Star, Trash2, Undo2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { todayIso } from '@/features/nutrition';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { useTheme } from '@/theme/ThemeProvider';
import {
  useAddWaterEntry,
  useDeleteWaterEntry,
  useUndoLastWaterEntry,
  useWaterDay,
  useWaterWeekSummary,
} from '../hooks/useWaterLog';
import { CUP_ML } from '../services/waterService';

type Props = NativeStackScreenProps<MainStackParamList, 'WaterLog'>;

const RING_SIZE = 160;
const RING_RADIUS = 68;
const RING_STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const QUICK_ADD_OPTIONS_ML = [100, 200, 500];
const MAX_BAR_HEIGHT = 70;

// design/WaterLog.dc.html (BR-031). Số "5/8 ly" tĩnh trước đây ở Pet mission/Dashboard/Reminders
// nay đọc thật từ waterService qua đây — xem gamificationService.getPetState() và
// RemindersScreen (mục tiêu hiển thị theo userProfileStore.waterGoalMl).
export function WaterLogScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const dateIso = todayIso();
  const { data, isLoading, isError, error, refetch } = useWaterDay(dateIso);
  const { data: week } = useWaterWeekSummary(dateIso);
  const addEntry = useAddWaterEntry(dateIso);
  const undoLast = useUndoLastWaterEntry(dateIso);
  const deleteEntry = useDeleteWaterEntry(dateIso);
  const waterGoalMl = useUserProfileStore(state => state.waterGoalMl);
  const setWaterGoalMl = useUserProfileStore(state => state.setWaterGoalMl);

  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(waterGoalMl));

  if (isLoading || !data) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Uống nước" onBack={() => navigation.goBack()} />
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Uống nước" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const cupsToday = Math.round(data.totalMl / CUP_ML);
  const cupsTarget = Math.round(data.goalMl / CUP_ML);
  const percent = data.goalMl > 0 ? Math.min(data.totalMl / data.goalMl, 1) : 0;

  const submitCustomAmount = () => {
    const amount = Number(customAmount);
    if (Number.isFinite(amount) && amount > 0) {
      addEntry.mutate(Math.round(amount));
    }
    setCustomAmount('');
    setShowCustomInput(false);
  };

  const submitGoal = () => {
    const goal = Number(draftGoal);
    if (Number.isFinite(goal) && goal > 0) {
      setWaterGoalMl(Math.round(goal));
    } else {
      setDraftGoal(String(waterGoalMl));
    }
    setShowGoalInput(false);
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Uống nước"
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Nhắc uống nước"
            variant="elevated"
            shape="square"
            icon={<Droplet size={22} color={colors.textPrimary} />}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.REMINDERS)}
          />
        }
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-md py-xs pb-xl"
      >
      <AppCard className="items-center gap-sm">
        <View style={{ width: RING_SIZE, height: RING_SIZE }}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.primarySoft}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.primary}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE * percent} ${CIRCUMFERENCE}`}
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center gap-xxs">
            <AppText variant="h2">{`${cupsToday}/${cupsTarget} ly`}</AppText>
            <AppText variant="caption" color="secondary">
              {`${data.totalMl.toLocaleString('vi-VN')} / ${data.goalMl.toLocaleString('vi-VN')} ml`}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center gap-xxs">
          <Star size={16} color={colors.warning} />
          <AppText variant="body" color="secondary">
            {`Đủ ${cupsTarget} ly để nhận +10 XP cho Bé Mầm`}
          </AppText>
        </View>
      </AppCard>

      <AppButton
        label={`+ 1 ly (${CUP_ML} ml)`}
        onPress={() => addEntry.mutate(CUP_ML)}
        loading={addEntry.isPending}
        className="mt-md h-[52px]"
      />

      <View className="flex-row flex-wrap gap-xs pt-sm">
        {QUICK_ADD_OPTIONS_ML.map(amount => (
          <AppChip key={amount} label={`+ ${amount} ml`} onPress={() => addEntry.mutate(amount)} />
        ))}
        <AppChip
          label="Nhập số khác"
          selected={showCustomInput}
          onPress={() => setShowCustomInput(current => !current)}
        />
      </View>
      {showCustomInput ? (
        <View className="flex-row items-end gap-sm pt-sm">
          <AppInput
            label="Số ml"
            placeholder="0"
            keyboardType="number-pad"
            value={customAmount}
            onChangeText={setCustomAmount}
            className="flex-1"
          />
          <AppButton label="Thêm" onPress={submitCustomAmount} className="h-[48px]" />
        </View>
      ) : null}

      <AppCard className="mt-lg gap-xxs">
        <View className="flex-row items-center justify-between pb-xxs">
          <AppText variant="h3">Hôm nay</AppText>
          {data.entries.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hoàn tác"
              onPress={() => undoLast.mutate()}
              className="min-h-[44px] flex-row items-center gap-xxs"
            >
              <Undo2 size={16} color={colors.primary} />
              <AppText variant="bodyMedium" color="primary">
                Hoàn tác
              </AppText>
            </Pressable>
          ) : null}
        </View>
        {data.entries.length === 0 ? (
          <AppText variant="body" color="secondary" className="py-sm">
            Chưa ghi lần uống nước nào hôm nay.
          </AppText>
        ) : (
          data.entries.map(entry => (
            <View key={entry.id} className="flex-row items-center gap-sm border-t border-border py-xs">
              <Droplet size={20} color={colors.primary} />
              <AppText variant="bodyLg" className="flex-1">
                {`${entry.amountMl} ml`}
              </AppText>
              <AppText variant="body" color="secondary">
                {entry.timeLabel}
              </AppText>
              <AppIconButton
                accessibilityLabel={`Xóa lần uống lúc ${entry.timeLabel}`}
                icon={<Trash2 size={20} color={colors.textSecondary} />}
                onPress={() => deleteEntry.mutate(entry.id)}
              />
            </View>
          ))
        )}
      </AppCard>

      {week ? (
        <AppCard className="mt-lg gap-sm">
          <View className="flex-row items-baseline justify-between">
            <AppText variant="h3">7 ngày qua</AppText>
            <AppBadge label={`Đạt ${week.daysOnTarget}/7 ngày`} />
          </View>
          <View className="flex-row items-end justify-between">
            {week.days.map(day => {
              const barHeight = Math.max(4, Math.min(MAX_BAR_HEIGHT, (day.totalMl / day.goalMl) * MAX_BAR_HEIGHT));
              const onTarget = day.totalMl >= day.goalMl;
              return (
                <View key={day.dateIso} className="items-center gap-xxs" style={{ height: MAX_BAR_HEIGHT + 24 }}>
                  <View className="flex-1 justify-end">
                    <View
                      className={`w-[22px] rounded-t-sm ${onTarget ? 'bg-primary' : 'bg-primary-soft'}`}
                      style={{ height: barHeight }}
                    />
                  </View>
                  <AppText variant="caption" color={day.isToday ? 'primary' : 'secondary'}>
                    {day.label}
                  </AppText>
                </View>
              );
            })}
          </View>
        </AppCard>
      ) : null}

      <View className="flex-row items-center justify-between py-lg">
        {showGoalInput ? (
          <View className="flex-1 flex-row items-end gap-sm">
            <AppInput
              label="Mục tiêu (ml)"
              keyboardType="number-pad"
              value={draftGoal}
              onChangeText={setDraftGoal}
              className="flex-1"
            />
            <AppButton label="Lưu" onPress={submitGoal} className="h-[48px]" />
          </View>
        ) : (
          <>
            <AppText variant="body" color="secondary">
              {`Mục tiêu: ${data.goalMl.toLocaleString('vi-VN')} ml/ngày`}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đổi mục tiêu"
              onPress={() => {
                setDraftGoal(String(waterGoalMl));
                setShowGoalInput(true);
              }}
              className="min-h-[44px] items-center justify-center"
            >
              <AppText variant="bodyMedium" color="primary">
                Đổi mục tiêu
              </AppText>
            </Pressable>
          </>
        )}
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}
