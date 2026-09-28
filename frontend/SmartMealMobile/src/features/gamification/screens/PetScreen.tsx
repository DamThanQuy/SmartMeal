import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, ChevronRight, Flame, Lock, Trophy } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppCard, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { PetAnimation, stageFromLevel } from '../components/PetAnimation';
import { usePetState } from '../hooks/usePetState';

type Props = NativeStackScreenProps<MainStackParamList, 'Pet'>;

const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// ─── XP burst label floats up then fades ─────────────────────────────────────
interface XpBurstProps {
  label: string;
  tone: 'water' | 'leaf';
}

function XpBurst({ label, tone }: XpBurstProps) {
  const { colors } = useTheme();
  const bgColor = tone === 'water' ? colors.primarySoft : colors.primarySoft;
  const textColor = tone === 'water' ? colors.primary : colors.successText ?? colors.primary;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(800).delay(400)}
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: 20,
        backgroundColor: bgColor,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}
    >
      <AppText variant="bodyMedium" style={{ color: textColor }}>
        {label}
      </AppText>
    </Animated.View>
  );
}

// ─── Streak day cell ──────────────────────────────────────────────────────────
interface StreakDayProps {
  label: string;
  done: boolean;
  index: number;
}

function StreakDay({ label, done, index }: StreakDayProps) {
  const { colors } = useTheme();
  // Staggered entrance — dùng AnimatedView với delay index * 50ms
  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).springify()}
      style={{ flex: 1, alignItems: 'center', gap: 6 }}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: done ? colors.primary : colors.surfaceElevated ?? colors.surface,
        }}
      >
        {done ? (
          <Check size={16} color={colors.onPrimary} strokeWidth={3} />
        ) : (
          <Lock size={13} color={colors.textSecondary} />
        )}
      </View>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

// design/Pet.dc.html + be-mam/index.tsx (design v2 — Bé Mầm giai đoạn 1-4, XP burst,
// Chuỗi ngày, Nhiệm vụ). Refactored theo kiến trúc dự án: hook → service → mock (không gọi API).
export function PetScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data: pet, isLoading, isError, error, refetch } = usePetState();

  // XP burst local state (không lưu vào store — chỉ visual feedback)
  const [bursts, setBursts] = React.useState<{ id: number; label: string; tone: 'water' | 'leaf' }[]>([]);
  const burstIdRef = useRef(0);

  // Hero card bounce scale khi nhận XP
  const heroScale = useSharedValue(1);
  const heroAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));

  const triggerHeroBounce = () => {
    heroScale.value = withSequence(
      withSpring(1.04, { stiffness: 300, damping: 10 }),
      withSpring(1, { stiffness: 200, damping: 14 }),
    );
  };

  const showBurst = (label: string, tone: 'water' | 'leaf') => {
    burstIdRef.current += 1;
    const id = burstIdRef.current;
    setBursts(prev => [...prev, { id, label, tone }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1600);
    triggerHeroBounce();
  };

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

  const stage = stageFromLevel(pet.level);
  const xpRatio = pet.xpPerLevel > 0 ? pet.xpIntoLevel / pet.xpPerLevel : 0;
  const xpToNextLevel = pet.xpPerLevel - pet.xpIntoLevel;
  const xpPercent = Math.round(xpRatio * 100);
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
        contentContainerClassName="gap-md py-sm"
      >
        {/* ── Hero Card ── */}
        <Animated.View style={heroAnimStyle}>
          <AppCard className="items-center gap-sm overflow-hidden">
            {/* Soft glow background */}
            <View
              className="absolute inset-x-0 top-0 h-[120px] rounded-card opacity-60"
              style={{ backgroundColor: colors.primarySoft }}
            />

            {/* Bé Mầm SVG hoạt hình */}
            <View className="relative items-center">
              <PetAnimation stage={stage} xpRatio={xpRatio} size={200} />
              {/* XP burst overlay */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
                {bursts.map(b => (
                  <XpBurst key={b.id} label={b.label} tone={b.tone} />
                ))}
              </View>
            </View>

            {/* Name + badge */}
            <AppText variant="h2" className="mt-xs text-center">
              {`${pet.name} · Level ${pet.level}`}
            </AppText>
            <AppBadge
              tone="primary"
              label="Ngày tốt lành"
              icon={<Check size={14} color={colors.successText} />}
            />

            {/* XP progress bar */}
            <View className="w-full gap-xxs">
              <View className="h-[12px] overflow-hidden rounded-pill bg-primary-soft">
                <Animated.View
                  style={{
                    height: '100%',
                    width: `${xpPercent}%`,
                    backgroundColor: colors.primary,
                    borderRadius: 999,
                  }}
                />
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

            {/* Pet message bubble */}
            <View className="relative w-full rounded-card bg-surface p-md">
              {/* Bubble tail */}
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  left: 24,
                  width: 12,
                  height: 12,
                  backgroundColor: colors.surfaceElevated ?? colors.surface,
                  transform: [{ rotate: '45deg' }],
                  borderRadius: 2,
                }}
              />
              <AppText variant="body" color="secondary">
                {pet.message}
              </AppText>
            </View>
          </AppCard>
        </Animated.View>

        {/* ── Chuỗi ngày ── */}
        <AppCard className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppText variant="h3">Chuỗi ngày</AppText>
            <AppBadge
              tone="warning"
              label={`${pet.streakDays} ngày liên tiếp`}
              icon={<Flame size={14} color={colors.warningText} />}
            />
          </View>
          <View className="flex-row justify-between gap-xs">
            {pet.weekCompletion.map((done, index) => (
              <StreakDay
                key={WEEKDAY_SHORT_LABELS[index]}
                label={WEEKDAY_SHORT_LABELS[index] ?? ''}
                done={done}
                index={index}
              />
            ))}
          </View>
          <AppText variant="caption" color="secondary">
            Một ngày hoàn thành khi ghi đủ 3 bữa chính và đạt 80% mục tiêu calo.
          </AppText>
        </AppCard>

        {/* ── Nhiệm vụ hôm nay ── */}
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
                    <AppText variant="bodyMedium" color="primary">{'•'}</AppText>
                  )}
                </View>
                <View className="flex-1 gap-xxs">
                  <View className="flex-row justify-between">
                    <AppText variant="bodyMedium">{task.label}</AppText>
                    <AppText variant="body" color="secondary">{task.progressLabel}</AppText>
                  </View>
                  <View className="h-[6px] overflow-hidden rounded-pill bg-primary-soft">
                    <View
                      className="h-[6px] rounded-pill bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </View>
                </View>
                <AppText variant="caption" color="success" className="min-w-[44px] text-right">
                  {`+${task.xpReward} XP`}
                </AppText>
              </>
            );

            if (task.id === 'water') {
              return (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.label} · ${task.progressLabel}`}
                  onPress={() => {
                    navigation.navigate(MAIN_STACK_ROUTES.WATER_LOG);
                    showBurst(`+${task.xpReward} XP`, 'water');
                  }}
                  className="min-h-[44px] flex-row items-center gap-sm border-t border-border py-xs"
                >
                  {rowContent}
                  <ChevronRight size={18} color={colors.textSecondary} />
                </Pressable>
              );
            }
            return (
              <View
                key={task.id}
                className="flex-row items-center gap-sm border-t border-border py-xs"
              >
                {rowContent}
              </View>
            );
          })}
        </AppCard>

        {/* ── Thử thách hiện tại ── */}
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
            <View
              className="h-[8px] rounded-pill bg-primary"
              style={{ width: `${challengePercent}%` }}
            />
          </View>
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
}
