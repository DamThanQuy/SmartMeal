import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Barcode, Camera, ChevronRight, Mic, Search, Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAiQuota, useAiQuotaStore } from '@/features/ai';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_OPTIONS, getMealTypeForHour, type MealType } from '@/types/meal.types';
import { AppChip, AppIconButton, AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'QuickLog'>;

interface QuickLogActionRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  aiBadge?: boolean;
  onPress: () => void;
}

function QuickLogActionRow({ icon, title, description, aiBadge, onPress }: QuickLogActionRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-md rounded-lg bg-background p-sm"
    >
      <View className="h-[48px] w-[48px] items-center justify-center rounded-lg bg-primary-soft">
        {icon}
      </View>
      <View className="flex-1 gap-xxs">
        <View className="flex-row items-center gap-sm">
          <AppText variant="bodyMedium">{title}</AppText>
          {aiBadge ? (
            <View className="h-[24px] flex-row items-center gap-xxs rounded-pill bg-info-soft px-sm">
              <AppText variant="caption" className="font-sans-semibold text-info-text">
                AI
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="body" color="secondary">
          {description}
        </AppText>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

// design/QuickLog.dc.html (docs/design.md mục 18). presentation:'transparentModal' khai báo ở
// MainNavigator để nền phía sau (Dashboard/Diary) vẫn hiện mờ phía sau bottom sheet.
export function QuickLogScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { remaining, limit, hasRemaining, isUnlimited } = useAiQuota();
  const micPermissionGranted = useAiQuotaStore(state => state.micPermissionGranted);
  const [mealType, setMealType] = useState<MealType>(
    route.params?.mealType ?? getMealTypeForHour(new Date().getHours()),
  );

  // BR-233 — hết quota AI chặn cả 2 luồng. BR-252 — mic chưa cấp quyền (mock luôn giả lập chưa
  // cấp) thì "Nói để ghi" phải qua VoicePermission trước, không vào thẳng VoiceLog.
  const goToAiFlow = (kind: 'photo' | 'voice') => {
    if (!hasRemaining) {
      navigation.navigate(MAIN_STACK_ROUTES.STATE_AI_LIMIT, { mealType });
      return;
    }
    if (kind === 'photo') {
      navigation.navigate(MAIN_STACK_ROUTES.AI_CAMERA, { mealType });
      return;
    }
    navigation.navigate(
      micPermissionGranted ? MAIN_STACK_ROUTES.VOICE_LOG : MAIN_STACK_ROUTES.VOICE_PERMISSION,
      { mealType },
    );
  };

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
        <View className="flex-row items-center justify-between">
          <AppText variant="h2">Ghi bữa ăn</AppText>
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        <View className="flex-row gap-xs">
          {MEAL_TYPE_OPTIONS.map(option => (
            <AppChip
              key={option.id}
              label={option.label}
              selected={mealType === option.id}
              onPress={() => setMealType(option.id)}
            />
          ))}
        </View>

        <View className="gap-sm">
          <QuickLogActionRow
            icon={<Camera size={24} color={colors.primary} />}
            title="Chụp món ăn"
            description="AI ước tính món, khẩu phần và calo"
            aiBadge
            onPress={() => goToAiFlow('photo')}
          />
          <QuickLogActionRow
            icon={<Mic size={24} color={colors.primary} />}
            title="Nói để ghi"
            description={'"Tối nay ăn một bát phở bò…"'}
            aiBadge
            onPress={() => goToAiFlow('voice')}
          />
          <QuickLogActionRow
            icon={<Search size={24} color={colors.primary} />}
            title="Tìm món"
            description="Tìm trong cơ sở dữ liệu thực phẩm"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.FOOD_SEARCH, { mealType })}
          />
          <QuickLogActionRow
            icon={<Barcode size={24} color={colors.primary} />}
            title="Quét sản phẩm"
            description="Mã vạch hoặc bảng dinh dưỡng"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.BARCODE, { mealType })}
          />
        </View>

        <View className="flex-row items-center gap-sm rounded-md bg-background p-sm">
          <Sparkles size={20} color={colors.primary} />
          <AppText variant="caption" color="secondary" className="flex-1">
            {isUnlimited ? (
              'Pro: dùng AI không giới hạn'
            ) : (
              <>
                {'Còn '}
                <AppText variant="bodyMedium">{`${remaining}/${limit}`}</AppText>
                {' lượt AI hôm nay'}
              </>
            )}
          </AppText>
          {isUnlimited ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nâng cấp Pro"
              onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PREMIUM)}
              className="min-h-[44px] items-center justify-center"
            >
              <AppText variant="bodyMedium" color="onPrimarySoft">
                Nâng cấp Pro
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
