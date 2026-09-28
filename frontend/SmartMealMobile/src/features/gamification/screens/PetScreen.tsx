import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, ChevronRight, Flame, PawPrint, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppCard, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { usePetState } from '../hooks/usePetState';

type Props = NativeStackScreenProps<MainStackParamList, 'Pet'>;

const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// design/Pet.dc.html (docs/design.md mục 36/37 — Gamification/Challenge, "hỗ trợ health habit,
// không làm app giống game quá mức"). Design v2: thêm icon "Thử thách và huy hiệu" → Challenges.
export function PetScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data: pet, isLoading, isError, error, refetch } = usePetState();

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Bé Mầm" onBack={() => navigation.goBack()} />
        <LoadingState lines={10} />
      </ScreenContainer>
    );
  }

  if (isError || !pet) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Bé Mầm" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const xpToNextLevel = pet.xpPerLevel - pet.xpIntoLevel;
  const xpPercent = Math.round((pet.xpIntoLevel / pet.xpPerLevel) * 100);
  const challengePercent = Math.round((pet.challenge.dayCurrent / pet.challenge.dayTotal) * 100);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={pet.name}
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Thử thách và huy hiệu"
            variant="elevated"
            shape="square"
            icon={<Trophy size={22} color={colors.textPrimary} />}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.CHALLENGES)}
          />
        }
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-sm"
      >
        <AppCard className="items-center gap-sm">
          <View className="h-[140px] w-[170px] items-center justify-center rounded-full bg-primary-soft">
            <PawPrint size={56} color={colors.primary} />
          </View>
          <AppText variant="h2">{`${pet.name} · Level ${pet.level}`}</AppText>
          <AppBadge
            tone="primary"
            label="Ngày tốt lành"
            icon={<Check size={14} color={colors.successText} />}
          />
          <View className="w-full gap-xxs">
            <View className="h-[10px] overflow-hidden rounded-pill bg-primary-soft">
              <View className="h-[10px] rounded-pill bg-primary" style={{ width: `${xpPercent}%` }} />
            </View>
            <View className="flex-row justify-between">
              <AppText variant="caption" color="secondary">
                {`${pet.xpIntoLevel} / ${pet.xpPerLevel} XP`}
              </AppText>
              <AppText variant="caption" color="secondary">
                {`Còn ${xpToNextLevel} XP lên Level ${pet.level + 1}`}
              </AppText>
            </View>
          </View>
          <AppText variant="body" color="secondary" className="text-center">
            {pet.message}
          </AppText>
        </AppCard>

        <AppCard className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppText variant="h3">Chuỗi ngày</AppText>
            <AppBadge
              tone="warning"
              label={`${pet.streakDays} ngày liên tiếp`}
              icon={<Flame size={14} color={colors.warningText} />}
            />
          </View>
          <View className="flex-row justify-between">
            {pet.weekCompletion.map((done, index) => (
              <View key={index} className="items-center gap-xxs">
                <View
                  className={`h-[32px] w-[32px] items-center justify-center rounded-full ${
                    done ? 'bg-primary' : 'bg-surface'
                  }`}
                >
                  {done ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
                </View>
                <AppText variant="caption" color="secondary">
                  {WEEKDAY_SHORT_LABELS[index]}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" color="secondary">
            Một ngày hoàn thành khi ghi đủ 3 bữa chính và đạt 80% mục tiêu calo.
          </AppText>
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3" className="mb-xxs">
            Nhiệm vụ hôm nay
          </AppText>
          {pet.tasks.map(task => {
            const percent = Math.min(
              100,
              Math.round((task.progressCurrent / task.progressTarget) * 100),
            );
            const rowContent = (
              <>
                <View
                  className={`h-[40px] w-[40px] items-center justify-center rounded-full ${
                    task.completed ? 'bg-primary' : 'bg-primary-soft'
                  }`}
                >
                  {task.completed ? (
                    <Check size={20} color={colors.onPrimary} />
                  ) : (
                    <AppText variant="bodyMedium" color="primary">
                      {'•'}
                    </AppText>
                  )}
                </View>
                <View className="flex-1 gap-xxs">
                  <View className="flex-row justify-between">
                    <AppText variant="bodyMedium">{task.label}</AppText>
                    <AppText variant="body" color="secondary">
                      {task.progressLabel}
                    </AppText>
                  </View>
                  <View className="h-[6px] overflow-hidden rounded-pill bg-primary-soft">
                    <View className="h-[6px] rounded-pill bg-primary" style={{ width: `${percent}%` }} />
                  </View>
                </View>
                <AppText variant="caption" color="success" className="min-w-[44px] text-right">
                  {`+${task.xpReward} XP`}
                </AppText>
              </>
            );
            // "Uống đủ nước" mở WaterLogScreen (Đợt 12) — điểm vào chính của tính năng ghi nước.
            if (task.id === 'water') {
              return (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.label} · ${task.progressLabel}`}
                  onPress={() => navigation.navigate(MAIN_STACK_ROUTES.WATER_LOG)}
                  className="min-h-[44px] flex-row items-center gap-sm border-t border-border py-xs"
                >
                  {rowContent}
                  <ChevronRight size={18} color={colors.textSecondary} />
                </Pressable>
              );
            }
            return (
              <View key={task.id} className="flex-row items-center gap-sm border-t border-border py-xs">
                {rowContent}
              </View>
            );
          })}
        </AppCard>

        <AppCard className="gap-sm">
          <View className="flex-row items-center gap-sm">
            <View className="h-[44px] w-[44px] items-center justify-center rounded-md bg-primary-soft">
              <Trophy size={22} color={colors.primary} />
            </View>
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyMedium">{pet.challenge.title}</AppText>
              <AppText variant="caption" color="secondary">
                {`Ngày ${pet.challenge.dayCurrent} / ${pet.challenge.dayTotal} · Thưởng +${pet.challenge.xpReward} XP`}
              </AppText>
            </View>
          </View>
          <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
            <View className="h-[8px] rounded-pill bg-primary" style={{ width: `${challengePercent}%` }} />
          </View>
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
}
