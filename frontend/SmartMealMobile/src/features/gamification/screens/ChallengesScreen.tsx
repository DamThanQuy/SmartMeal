import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Award, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppIconButton, AppSegmentedControl, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useChallenges, useCompleteChallenge, useJoinChallenge } from '../hooks/useChallenges';
import type { ChallengeWithWindow } from '../types/challenge.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Challenges'>;

type ChallengeTab = 'joined' | 'explore' | 'done';

const TAB_OPTIONS: { id: ChallengeTab; label: string }[] = [
  { id: 'joined', label: 'Đang tham gia' },
  { id: 'explore', label: 'Khám phá' },
  { id: 'done', label: 'Đã xong' },
];

function partitionByTab(challenges: ChallengeWithWindow[], tab: ChallengeTab): ChallengeWithWindow[] {
  if (tab === 'joined') return challenges.filter(item => item.joined && !item.completed);
  if (tab === 'done') return challenges.filter(item => item.completed);
  return challenges.filter(item => !item.joined && !item.completed);
}

// design/Challenges.dc.html (BR-211, BR-212). "Xem chi tiết" trên thử thách đã tham gia mô
// phỏng luôn kết quả hoàn thành (BR-212, thưởng đúng 1 lần qua awardXpOnce) — nhánh feat/mock-ui
// không chờ được 7 ngày thật (CLAUDE.md mục 8).
export function ChallengesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useChallenges();
  const joinChallenge = useJoinChallenge();
  const completeChallenge = useCompleteChallenge();
  const [tab, setTab] = useState<ChallengeTab>('joined');

  const handleComplete = (challengeId: string) => {
    completeChallenge.mutate(challengeId, {
      onSuccess: () => navigation.navigate(MAIN_STACK_ROUTES.CHALLENGE_COMPLETE, { challengeId }),
    });
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Thử thách"
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Huy hiệu và trang phục"
            variant="elevated"
            shape="square"
            icon={<Award size={22} color={colors.textPrimary} />}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.BADGES)}
          />
        }
      />
      <View className="py-xs">
        <AppSegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </View>

      {isLoading ? (
        <LoadingState lines={8} />
      ) : isError ? (
        <ErrorState description={error?.message} onRetry={refetch} />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-md py-sm"
        >
          {!data || partitionByTab(data, tab).length === 0 ? (
            <EmptyState
              title={
                tab === 'joined'
                  ? 'Chưa tham gia thử thách nào'
                  : tab === 'done'
                    ? 'Chưa hoàn thành thử thách nào'
                    : 'Chưa có thử thách để khám phá'
              }
              description={
                tab === 'joined' ? 'Chuyển sang tab Khám phá để tham gia thử thách mới.' : undefined
              }
            />
          ) : (
            partitionByTab(data, tab).map(challenge => (
              <AppCard key={challenge.id} className="gap-sm">
                <View className="flex-row items-start justify-between gap-sm">
                  <View className="flex-1 gap-xxs">
                    <AppText variant="bodyMedium">{challenge.title}</AppText>
                    <AppText variant="caption" color="secondary">
                      {challenge.completed
                        ? `Đã hoàn thành · +${challenge.xpReward} XP`
                        : challenge.windowState === 'upcoming'
                          ? `${format(new Date(challenge.startIso), 'dd/MM')} – ${format(new Date(challenge.endIso), 'dd/MM')} · Thưởng +${challenge.xpReward} XP`
                          : challenge.windowState === 'ended'
                            ? `Đã kết thúc ${format(new Date(challenge.endIso), 'dd/MM')}`
                            : `Đến hết ${format(new Date(challenge.endIso), 'dd/MM')} · Thưởng +${challenge.xpReward} XP`}
                    </AppText>
                  </View>
                  {challenge.completed ? (
                    <AppBadge
                      label="Đã xong"
                      tone="primary"
                      icon={<CheckCircle2 size={14} color={colors.onPrimarySoft} />}
                    />
                  ) : challenge.windowState === 'active' && challenge.joined ? (
                    <AppBadge
                      label="Đang tham gia"
                      tone="primary"
                      icon={<CheckCircle2 size={14} color={colors.onPrimarySoft} />}
                    />
                  ) : challenge.windowState === 'active' ? (
                    <AppBadge label="Mở đăng ký" tone="info" icon={<Clock size={14} color={colors.infoText} />} />
                  ) : challenge.windowState === 'upcoming' ? (
                    <AppBadge label="Sắp bắt đầu" tone="warning" icon={<Clock size={14} color={colors.warningText} />} />
                  ) : (
                    <AppBadge label="Đã kết thúc" tone="neutral" icon={<XCircle size={14} color={colors.textSecondary} />} />
                  )}
                </View>

                {!challenge.completed && challenge.joined ? (
                  <View className="gap-xxs">
                    <View className="h-[10px] overflow-hidden rounded-pill bg-primary-soft">
                      <View
                        className="h-[10px] rounded-pill bg-primary"
                        style={{ width: `${Math.round((challenge.dayCurrent / challenge.dayTotal) * 100)}%` }}
                      />
                    </View>
                    <AppText variant="caption" color="secondary">
                      {`Ngày ${challenge.dayCurrent} / ${challenge.dayTotal}`}
                    </AppText>
                  </View>
                ) : !challenge.joined && challenge.windowState !== 'ended' && !challenge.completed ? (
                  <AppText variant="body" color="secondary">
                    {challenge.description}
                  </AppText>
                ) : null}

                {challenge.completed ? null : challenge.joined ? (
                  <AppButton
                    label="Xem chi tiết"
                    variant="secondary"
                    onPress={() => handleComplete(challenge.id)}
                    loading={completeChallenge.isPending}
                  />
                ) : challenge.windowState === 'active' ? (
                  <AppButton
                    label="Tham gia"
                    onPress={() => joinChallenge.mutate(challenge.id)}
                    loading={joinChallenge.isPending}
                  />
                ) : challenge.windowState === 'upcoming' ? (
                  <AppButton label={`Bắt đầu ${format(new Date(challenge.startIso), 'dd/MM')}`} variant="outline" disabled />
                ) : null}
              </AppCard>
            ))
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
