import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { DAILY_AI_QUOTA_LIMIT } from '../state/aiQuotaStore';

type Props = NativeStackScreenProps<MainStackParamList, 'StateAILimit'>;

// design/StateAILimit.dc.html (BR-233). Bottom sheet — presentation:'transparentModal' khai
// báo ở MainNavigator. "Nâng cấp Pro" chưa nối Premium (Đợt 8 mới dựng) nên tạm đóng sheet.
export function StateAILimitScreen({ navigation, route }: Props) {
  const { mealType } = route.params ?? {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        className="absolute inset-0 bg-overlay/45"
        onPress={() => navigation.goBack()}
      />
      <View
        className="gap-lg rounded-t-sheet bg-surface p-lg"
        style={[shadows.elevated, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View className="h-[4px] w-[40px] self-center rounded-pill bg-border" />
        <View className="items-center gap-sm">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
            <Sparkles size={34} color={colors.primary} />
          </View>
          <AppText variant="h1" className="text-center">
            {`Bạn đã dùng hết ${DAILY_AI_QUOTA_LIMIT}/${DAILY_AI_QUOTA_LIMIT} lượt AI hôm nay`}
          </AppText>
          <AppText variant="body" color="secondary" className="text-center">
            Lượt AI sẽ làm mới vào 00:00. Bạn vẫn có thể ghi bữa ăn thủ công, hoặc nâng cấp Pro
            để dùng AI không giới hạn.
          </AppText>
        </View>

        <View className="gap-sm">
          <AppButton
            label="Nâng cấp Pro"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PREMIUM)}
          />
          <AppButton
            label="Ghi thủ công"
            variant="outline"
            onPress={() =>
              navigation.replace(MAIN_STACK_ROUTES.FOOD_SEARCH, { mealType: mealType ?? 'snack' })
            }
          />
        </View>
      </View>
    </View>
  );
}
