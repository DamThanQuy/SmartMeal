import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppChip, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS, DIETARY_PREFERENCE_OPTIONS } from '@/features/health';
import { RECIPE_DATABASE_MOCK, useFavoritesStore } from '@/features/recipes';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { SlotOptionRow } from '../components/SlotOptionRow';
import { useSetMealSlot, useSlotSuggestions, useWeekPlan } from '../hooks/useMealPlanner';
import type { SlotSuggestionOption } from '../types/mealPlanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'SlotPicker'>;

type SuggestionTab = 'suggested' | 'favorite' | 'collection';

const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// design/SlotPicker.dc.html (BR-160, BR-101/102). Chọn 1 công thức cho 1 slot (ngày + bữa) —
// không có bottom nav, sibling của MainTabs (xem src/navigation/types.ts).
export function SlotPickerScreen({ navigation, route }: Props) {
  const { weekStartIso, dateIso, mealType } = route.params;
  const { colors } = useTheme();
  const [tab, setTab] = useState<SuggestionTab>('suggested');

  const weekPlan = useWeekPlan(weekStartIso);
  const suggestions = useSlotSuggestions(tab === 'suggested');
  const setSlot = useSetMealSlot(weekStartIso);
  const favoriteIds = useFavoritesStore(state => state.favoriteIds);

  const currentSlotRecipeId = weekPlan.data?.days.find(day => day.dateIso === dateIso)?.meals[
    mealType
  ]?.recipeId;
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>(
    currentSlotRecipeId,
  );

  const favoriteOptions = useMemo<SlotSuggestionOption[]>(
    () =>
      favoriteIds
        .map(id => RECIPE_DATABASE_MOCK.find(recipe => recipe.id === id))
        .filter((recipe): recipe is (typeof RECIPE_DATABASE_MOCK)[number] => Boolean(recipe))
        .map(recipe => ({
          recipeId: recipe.id,
          recipeName: recipe.name,
          durationMinutes: recipe.durationMinutes,
          calories: recipe.nutritionPerServing.calories,
          reasonLabel: 'Đã yêu thích',
        })),
    [favoriteIds],
  );

  const dayIndex = weekPlan.data?.days.findIndex(day => day.dateIso === dateIso) ?? 0;
  const dateLabel = `${WEEKDAY_SHORT_LABELS[dayIndex] ?? ''} ${dateIso.slice(8, 10)}/${dateIso.slice(5, 7)}`;
  const remainingCalories = weekPlan.data
    ? weekPlan.data.calorieTarget -
      (weekPlan.data.days.find(day => day.dateIso === dateIso)?.plannedCalories ?? 0)
    : undefined;

  const excludedAllergyLabels = (suggestions.data?.excludedAllergenIds ?? [])
    .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const dietaryPreferenceIds = useUserProfileStore(state => state.dietaryPreferenceIds);
  const dietaryPreferenceLabel = DIETARY_PREFERENCE_OPTIONS.find(
    option => option.id === dietaryPreferenceIds[0],
  )?.label;

  const options: SlotSuggestionOption[] =
    tab === 'suggested' ? suggestions.data?.options ?? [] : tab === 'favorite' ? favoriteOptions : [];

  const isLoadingOptions = tab === 'suggested' && suggestions.isLoading;
  const isErrorOptions = tab === 'suggested' && suggestions.isError;

  const handleConfirm = () => {
    if (!selectedRecipeId) return;
    setSlot.mutate(
      { dateIso, mealType, recipeId: selectedRecipeId },
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={`${MEAL_TYPE_TITLES[mealType]} · ${dateLabel}`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-md py-sm"
      >
        {remainingCalories !== undefined ? (
          <AppCard className="flex-row items-center justify-between">
            <AppText variant="body" color="secondary">
              Còn lại cho ngày này
            </AppText>
            <AppText variant="h3" color="success">
              {`${remainingCalories} kcal`}
            </AppText>
          </AppCard>
        ) : null}

        <View className="flex-row gap-xs">
          <AppChip label="Gợi ý" selected={tab === 'suggested'} onPress={() => setTab('suggested')} />
          <AppChip label="Yêu thích" selected={tab === 'favorite'} onPress={() => setTab('favorite')} />
          <AppChip
            label="Bộ sưu tập"
            selected={tab === 'collection'}
            onPress={() => setTab('collection')}
          />
        </View>

        {tab === 'suggested' ? (
          <View className="flex-row items-center gap-xs">
            <ShieldCheck size={18} color={colors.primary} />
            <AppText variant="caption" color="secondary" className="flex-1">
              {excludedAllergyLabels.length > 0
                ? `Đã loại món chứa ${excludedAllergyLabels.join(', ')} theo dị ứng của bạn.`
                : `Đã lọc theo dị ứng, bệnh lý${dietaryPreferenceLabel ? ` và ${dietaryPreferenceLabel}` : ''}.`}
            </AppText>
          </View>
        ) : null}

        {isLoadingOptions ? <LoadingState lines={4} /> : null}
        {isErrorOptions ? (
          <ErrorState description={suggestions.error?.message} onRetry={() => suggestions.refetch()} />
        ) : null}

        {!isLoadingOptions && !isErrorOptions ? (
          <View className="gap-sm">
            {options.length === 0 ? (
              <EmptyState
                title={tab === 'collection' ? 'Chưa có bộ sưu tập' : 'Chưa có món phù hợp'}
                description={
                  tab === 'collection'
                    ? 'Bộ sưu tập cho bữa này sẽ có ở bản cập nhật sau.'
                    : 'Thử lại với tab khác hoặc quay lại sau.'
                }
              />
            ) : (
              options.map(option => (
                <SlotOptionRow
                  key={option.recipeId}
                  name={option.recipeName}
                  durationMinutes={option.durationMinutes}
                  calories={option.calories}
                  reasonLabel={option.reasonLabel}
                  selected={selectedRecipeId === option.recipeId}
                  onPress={() => setSelectedRecipeId(option.recipeId)}
                />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-sm py-md">
        <AppButton
          label="Xem công thức"
          variant="outline"
          disabled={!selectedRecipeId}
          onPress={() =>
            selectedRecipeId &&
            navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, { recipeId: selectedRecipeId })
          }
          className="flex-shrink"
        />
        <AppButton
          label={`Thêm vào ${MEAL_TYPE_TITLES[mealType]}`}
          disabled={!selectedRecipeId}
          loading={setSlot.isPending}
          onPress={handleConfirm}
          className="flex-1"
        />
      </View>
    </ScreenContainer>
  );
}
