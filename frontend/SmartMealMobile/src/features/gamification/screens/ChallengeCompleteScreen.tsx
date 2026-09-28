import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Award, Shirt, Sparkles } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { LoadingState } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useChallengeDetail } from '../hooks/useChallenges';
import { BADGE_DEFINITIONS_MOCK, COSTUME_DEFINITIONS_MOCK } from '../mocks/badges.mock';

type Props = NativeStackScreenProps<MainStackParamList, 'ChallengeComplete'>;

interface RewardTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function RewardTile({ icon, title, subtitle }: RewardTileProps) {
  return (
    <View className="flex-1 items-center gap-xxs rounded-card bg-primary-soft p-sm">
      <View className="h-[44px] w-[44px] items-center justify-center rounded-pill bg-primary">
        {icon}
      </View>
      <AppText variant="bodyMedium" className="text-center">
        {title}
      </AppText>
      <AppText variant="caption" color="secondary" className="text-center">
        {subtitle}
      </AppText>
    </View>
  );
}

// design/ChallengeComplete.dc.html (BR-212 — thưởng XP/huy hiệu/trang phục đúng 1 lần, đã cộng
// ở challengeService.completeChallenge() trước khi điều hướng tới đây).
export function ChallengeCompleteScreen({ navigation, route }: Props) {
  const { challengeId } = route.params;
  const { colors } = useTheme();
  const { data: challenge } = useChallengeDetail(challengeId);

  if (!challenge) {
    return (
      <View className="flex-1 items-center justify-center bg-overlay/45">
        <LoadingState lines={4} />
      </View>
    );
  }

  const badge = challenge.badgeId
    ? BADGE_DEFINITIONS_MOCK.find(item => item.id === challenge.badgeId)
    : undefined;
  const costume = challenge.costumeId
    ? COSTUME_DEFINITIONS_MOCK.find(item => item.id === challenge.costumeId)
    : undefined;

  return (
    <View className="flex-1 items-center justify-center bg-overlay/45 px-lg">
      <View className="w-full items-center gap-md rounded-sheet bg-surface p-lg">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
          <Sparkles size={34} color={colors.primary} />
        </View>
        <AppText variant="h2" className="text-center">
          Hoàn thành thử thách!
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          {`Bạn đã hoàn thành ${challenge.title}. Nhận thưởng cho Bé Mầm nhé.`}
        </AppText>

        <View className="flex-row gap-sm">
          <RewardTile
            icon={<Sparkles size={22} color={colors.onPrimary} />}
            title={`+${challenge.xpReward} XP`}
            subtitle="Kinh nghiệm"
          />
          {badge ? (
            <RewardTile
              icon={<Award size={22} color={colors.onPrimary} />}
              title={badge.title}
              subtitle="Huy hiệu mới"
            />
          ) : null}
          {costume ? (
            <RewardTile
              icon={<Shirt size={22} color={colors.onPrimary} />}
              title={costume.title}
              subtitle="Trang phục"
            />
          ) : null}
        </View>

        <View className="w-full gap-xs">
          <AppButton
            label="Nhận thưởng"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.BADGES)}
          />
          <AppButton
            label="Để sau"
            variant="text"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.PET)}
          />
        </View>
      </View>
    </View>
  );
}
