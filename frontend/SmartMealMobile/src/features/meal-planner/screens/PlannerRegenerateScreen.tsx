import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format } from 'date-fns';
import { Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBadge, AppButton, AppIconButton, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS, DIETARY_PREFERENCE_OPTIONS } from '@/features/health';
import { calculateCalorieBudget, CURRENT_USER_DAILY_TARGET, TODAY_ACTIVITY_CALORIES_BURNED_MOCK } from '@/features/nutrition';
import type { MainStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useAutoFillWeek, useRegenerateWeek } from '../hooks/useMealPlanner';

type Props = NativeStackScreenProps<MainStackParamList, 'PlannerRegenerate'>;

type RegenerateChoice = 'keep' | 'regenerateAll';

interface RegenerateOptionProps {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function RegenerateOption({ title, description, selected, onPress }: RegenerateOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[64px] flex-row items-center gap-md rounded-card border p-md ${
        selected ? 'border-2 border-primary bg-primary-soft' : 'border-border bg-surface'
      }`}
    >
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" color="secondary">
          {description}
        </AppText>
      </View>
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
          selected ? 'border-primary' : 'border-border'
        }`}
      >
        {selected ? <View className="h-[12px] w-[12px] rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}

// design/PlannerRegenerate.dc.html (BR-163, BR-101/102, BR-230/231). Chỉ Pro vào được màn này
// (Free bị chặn ở MealPlannerScreen, mở Premium thay vì điều hướng tới đây). Mặc định "Giữ các
// bữa tôi đã chọn" — KHÔNG bao giờ tự chọn "Tạo lại toàn bộ tuần" thay user.
export function PlannerRegenerateScreen({ navigation, route }: Props) {
  const { weekStartIso } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [choice, setChoice] = useState<RegenerateChoice>('keep');
  const autoFillWeek = useAutoFillWeek(weekStartIso);
  const regenerateWeek = useRegenerateWeek(weekStartIso);
  const allergyIds = useUserProfileStore(state => state.allergyIds);
  const dietaryPreferenceIds = useUserProfileStore(state => state.dietaryPreferenceIds);
  const includeActivityCalories = useUserProfileStore(state => state.includeActivityCalories);

  const { budget } = calculateCalorieBudget({
    calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget,
    activityCaloriesBurned: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
    includeActivityCalories,
  });
  const dietLabel = DIETARY_PREFERENCE_OPTIONS.find(option => option.id === dietaryPreferenceIds[0])?.label;
  const allergyLabels = allergyIds
    .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label)
    .filter((label): label is string => Boolean(label))
    .join(', ');

  const isPending = autoFillWeek.isPending || regenerateWeek.isPending;
  const errorMessage = autoFillWeek.error?.message ?? regenerateWeek.error?.message;

  const handleGenerate = () => {
    const mutation = choice === 'keep' ? autoFillWeek : regenerateWeek;
    mutation.mutate(undefined, { onSuccess: () => navigation.goBack() });
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
        <View className="flex-row items-center justify-between gap-sm">
          <AppText variant="h2" className="flex-1">
            Gợi ý thực đơn bằng AI
          </AppText>
          <AppBadge label="Pro" icon={<Sparkles size={12} color={colors.onPrimarySoft} />} />
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        <AppText variant="body" color="secondary">
          {`Chọn cách áp dụng gợi ý cho tuần ${format(new Date(weekStartIso), 'dd/MM')}–${format(addDays(new Date(weekStartIso), 6), 'dd/MM')}.`}
        </AppText>

        <View className="gap-sm">
          <RegenerateOption
            title="Giữ các bữa tôi đã chọn"
            description="Chỉ điền vào những bữa còn trống"
            selected={choice === 'keep'}
            onPress={() => setChoice('keep')}
          />
          <RegenerateOption
            title="Tạo lại toàn bộ tuần"
            description="Ghi đè cả những bữa bạn đã sửa tay"
            selected={choice === 'regenerateAll'}
            onPress={() => setChoice('regenerateAll')}
          />
        </View>

        <View className="flex-row items-center gap-sm rounded-md bg-primary-soft p-md">
          <Sparkles size={22} color={colors.primary} />
          <AppText variant="caption" className="flex-1">
            {`Gợi ý theo mục tiêu ${budget.toLocaleString('vi-VN')} kcal/ngày${dietLabel ? `, chế độ ${dietLabel}` : ''}${
              allergyLabels ? ` và đã loại món chứa ${allergyLabels}` : ''
            }.`}
          </AppText>
        </View>

        {errorMessage ? (
          <AppText variant="caption" color="error">
            {errorMessage}
          </AppText>
        ) : null}

        <View className="flex-row gap-sm">
          <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} className="flex-shrink" />
          <AppButton label="Tạo gợi ý" onPress={handleGenerate} loading={isPending} className="flex-1" />
        </View>
      </View>
    </View>
  );
}
