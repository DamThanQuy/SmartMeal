import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Award, Check, Flame, Lock, PawPrint, Shirt, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppCard, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useBadgesSummary, useEquipCostume } from '../hooks/useBadges';

type Props = NativeStackScreenProps<MainStackParamList, 'Badges'>;

// design/Badges.dc.html. Huy hiệu/trang phục chưa mở LUÔN có icon khóa + chữ "Chưa mở" (không
// chỉ đổi màu xám) để rõ ràng cho user (docs/ui-mock-prompts.md Phase 12).
export function BadgesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useBadgesSummary();
  const equipCostume = useEquipCostume();

  if (isLoading || !data) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Huy hiệu và trang phục" onBack={() => navigation.goBack()} />
        <LoadingState lines={10} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Huy hiệu và trang phục" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Huy hiệu và trang phục"
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Thử thách"
            variant="elevated"
            shape="square"
            icon={<Trophy size={22} color={colors.textPrimary} />}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.CHALLENGES)}
          />
        }
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-sm">
        <AppCard className="flex-row items-center gap-sm">
          <View className="h-[80px] w-[80px] items-center justify-center rounded-lg bg-primary-soft">
            <PawPrint size={36} color={colors.primary} />
          </View>
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium">{`${data.petName} · Level ${data.level}`}</AppText>
            <AppBadge
              label={`Chuỗi ${data.streakDays} ngày`}
              tone="warning"
              icon={<Flame size={14} color={colors.warningText} />}
            />
            <AppText variant="caption" color="secondary">
              {`Đã mở ${data.unlockedBadgeCount}/${data.totalBadgeCount} huy hiệu`}
            </AppText>
          </View>
        </AppCard>

        <View className="gap-sm">
          <AppText variant="h2">Huy hiệu</AppText>
          <View className="flex-row flex-wrap gap-sm">
            {data.badges.map(badge => (
              <View
                key={badge.id}
                className={`w-[31%] items-center gap-xxs rounded-card p-sm ${
                  badge.unlocked ? 'bg-primary-soft' : 'bg-surface-subtle'
                }`}
              >
                <View
                  className={`h-[52px] w-[52px] items-center justify-center rounded-pill ${
                    badge.unlocked ? 'bg-primary' : 'bg-border'
                  }`}
                >
                  {badge.unlocked ? (
                    <Award size={24} color={colors.onPrimary} />
                  ) : (
                    <Lock size={22} color={colors.textSecondary} />
                  )}
                </View>
                <AppText variant="caption" className="text-center font-sans-semibold">
                  {badge.title}
                </AppText>
                <AppText variant="caption" color="secondary" className="text-center">
                  {badge.unlocked ? badge.description : 'Chưa mở'}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <AppCard className="gap-xxs">
          <AppText variant="h3" className="mb-xxs">
            Trang phục của Bé Mầm
          </AppText>
          {data.costumes.map(costume => (
            <Pressable
              key={costume.id}
              accessibilityRole={costume.unlocked ? 'button' : undefined}
              accessibilityLabel={costume.title}
              accessibilityState={{ disabled: !costume.unlocked, selected: costume.equipped }}
              disabled={!costume.unlocked || costume.equipped}
              onPress={() => equipCostume.mutate(costume.id)}
              className="min-h-[44px] flex-row items-center gap-sm border-t border-border py-xs"
            >
              <View
                className={`h-[44px] w-[44px] items-center justify-center rounded-md ${
                  costume.unlocked ? 'bg-primary-soft' : 'bg-surface-subtle'
                }`}
              >
                {costume.unlocked ? (
                  <Shirt size={22} color={colors.primary} />
                ) : (
                  <Lock size={20} color={colors.textSecondary} />
                )}
              </View>
              <View className="flex-1 gap-xxs">
                <AppText variant="bodyMedium">{costume.title}</AppText>
                <AppText variant="caption" color="secondary">
                  {costume.unlockDescription}
                </AppText>
              </View>
              <AppBadge
                label={costume.equipped ? 'Đang mặc' : costume.unlocked ? 'Đã mở' : 'Chưa mở'}
                tone={costume.equipped || costume.unlocked ? 'primary' : 'neutral'}
                icon={
                  costume.equipped || costume.unlocked ? (
                    <Check size={12} color={colors.onPrimarySoft} />
                  ) : (
                    <Lock size={12} color={colors.textSecondary} />
                  )
                }
              />
            </Pressable>
          ))}
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
}
