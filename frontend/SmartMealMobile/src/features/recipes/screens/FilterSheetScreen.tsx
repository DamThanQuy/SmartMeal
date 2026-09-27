import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppChip, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useRecommendedRecipes } from '../hooks/useRecipes';
import {
  RECIPE_TAG_OPTIONS,
  type CalorieFilter,
  type CookTimeFilter,
  type RecipeFilters,
  type RecipeTag,
} from '../types/recipe.types';

type Props = NativeStackScreenProps<MainStackParamList, 'FilterSheet'>;

const DIET_TAG_OPTIONS = RECIPE_TAG_OPTIONS.filter(option => option.id !== 'quick');
const COOK_TIME_OPTIONS: { id: CookTimeFilter; label: string }[] = [
  { id: '15', label: '≤ 15 phút' },
  { id: '30', label: '≤ 30 phút' },
  { id: '60', label: '≤ 60 phút' },
];
const CALORIE_OPTIONS: { id: CalorieFilter; label: string }[] = [
  { id: 'under300', label: '< 300' },
  { id: '300to500', label: '300–500' },
  { id: 'over500', label: '> 500' },
];
// design/FilterSheet.dc.html — chỉ hiển thị, chưa lọc thật (Recipe chưa gắn mealType).
const MEAL_CHIP_LABELS = ['Sáng', 'Trưa', 'Tối', 'Phụ'];

// design/FilterSheet.dc.html (BR-100, BR-101/102). presentation:'transparentModal'.
export function FilterSheetScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [draftFilters, setDraftFilters] = useState<RecipeFilters>(route.params?.filters ?? {});

  const { data } = useRecommendedRecipes(draftFilters);
  const resultCount = data?.recipes.length ?? 0;

  const toggleTag = (tag: RecipeTag) =>
    setDraftFilters(current => ({ ...current, tag: current.tag === tag ? undefined : tag }));
  const toggleCookTime = (value: CookTimeFilter) =>
    setDraftFilters(current => ({
      ...current,
      cookTime: current.cookTime === value ? undefined : value,
    }));
  const toggleCalorie = (value: CalorieFilter) =>
    setDraftFilters(current => ({
      ...current,
      calorie: current.calorie === value ? undefined : value,
    }));

  const applyAndClose = () => {
    navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
      screen: MAIN_TAB_ROUTES.DISCOVER,
      params: { filters: draftFilters },
    });
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
          <AppText variant="h2">Bộ lọc</AppText>
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        <View className="gap-sm">
          <AppText variant="bodyMedium">Chế độ ăn</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {DIET_TAG_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={draftFilters.tag === option.id}
                onPress={() => toggleTag(option.id)}
              />
            ))}
          </View>
        </View>

        <View className="gap-sm">
          <AppText variant="bodyMedium">Thời gian nấu</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {COOK_TIME_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={draftFilters.cookTime === option.id}
                onPress={() => toggleCookTime(option.id)}
              />
            ))}
          </View>
        </View>

        <View className="gap-sm">
          <AppText variant="bodyMedium">Calo / phần</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {CALORIE_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={draftFilters.calorie === option.id}
                onPress={() => toggleCalorie(option.id)}
              />
            ))}
          </View>
        </View>

        <View className="gap-sm">
          <AppText variant="bodyMedium">Bữa</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {MEAL_CHIP_LABELS.map(label => (
              <AppChip key={label} label={label} selected={false} disabled />
            ))}
          </View>
        </View>

        <View className="flex-row items-center gap-sm rounded-md bg-primary-soft p-md opacity-60">
          <ShieldCheck size={22} color={colors.primary} />
          <View className="flex-1">
            <AppText variant="bodyMedium">Ẩn món chứa dị ứng</AppText>
            <AppText variant="caption" color="secondary">
              Luôn bật · theo hồ sơ sức khỏe của bạn (BR-101/102)
            </AppText>
          </View>
        </View>

        <View className="flex-row gap-sm">
          <AppButton label="Đặt lại" variant="outline" onPress={() => setDraftFilters({})} />
          <AppButton
            label={`Xem ${resultCount} kết quả`}
            onPress={applyAndClose}
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
}
