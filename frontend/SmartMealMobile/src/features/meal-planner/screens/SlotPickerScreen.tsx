import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppChip, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS, DIETARY_PREFERENCE_OPTIONS } from '@/features/health';
import {
  filterOutUserAllergens,
  useCollections,
  useFavoriteRecipes,
  type Recipe,
} from '@/features/recipes';
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

/** Món đã lưu cũng phải qua bộ lọc dị ứng trước khi xếp vào thực đơn (BR-101/102/162). */
function toSafeOptions(recipes: Recipe[], reasonOf: (recipe: Recipe) => string): SlotSuggestionOption[] {
  const unique = new Map<string, Recipe>();
  recipes.forEach(recipe => {
    if (!unique.has(recipe.id)) unique.set(recipe.id, recipe);
  });
  return filterOutUserAllergens(Array.from(unique.values()))
    .allowed.map(recipe => ({
      recipeId: recipe.id,
      recipeName: recipe.name,
      durationMinutes: recipe.durationMinutes,
      calories: recipe.nutritionPerServing.calories,
      reasonLabel: reasonOf(recipe),
    }));
}

// design/SlotPicker.dc.html (BR-160, BR-101/102). Chọn 1 công thức cho 1 slot (ngày + bữa) —
// không có bottom nav, sibling của MainTabs (xem src/navigation/types.ts).
export function SlotPickerScreen({ navigation, route }: Props) {
  const { weekStartIso, dateIso, mealType } = route.params;
  const { colors } = useTheme();
  const [tab, setTab] = useState<SuggestionTab>('suggested');

  const weekPlan = useWeekPlan(weekStartIso);
  const suggestions = useSlotSuggestions(tab === 'suggested');
  const setSlot = useSetMealSlot(weekStartIso);
  const favoritesQuery = useFavoriteRecipes(tab === 'favorite');
  const collectionsQuery = useCollections(tab === 'collection');

  const currentSlotRecipeId = weekPlan.data?.days.find(day => day.dateIso === dateIso)?.meals[
    mealType
  ]?.recipeId;
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>(
    currentSlotRecipeId,
  );

  const favoriteOptions = useMemo<SlotSuggestionOption[]>(
    () => toSafeOptions(favoritesQuery.data ?? [], () => 'Đã yêu thích'),
    [favoritesQuery.data],
  );

  const collectionOptions = useMemo<SlotSuggestionOption[]>(() => {
    const mine = (collectionsQuery.data ?? []).filter(collection => collection.isOwner);
    const collectionNameOf = new Map<string, string>();
    mine.forEach(collection =>
      collection.recipes.forEach(recipe => {
        if (!collectionNameOf.has(recipe.id)) collectionNameOf.set(recipe.id, collection.name);
      }),
    );
    return toSafeOptions(
      mine.flatMap(collection => collection.recipes),
      recipe => collectionNameOf.get(recipe.id) ?? 'Bộ sưu tập',
    );
  }, [collectionsQuery.data]);

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

  const activeQuery = tab === 'suggested' ? suggestions : tab === 'favorite' ? favoritesQuery : collectionsQuery;
  const options: SlotSuggestionOption[] =
    tab === 'suggested' ? suggestions.data?.options ?? [] : tab === 'favorite' ? favoriteOptions : collectionOptions;

  const isLoadingOptions = activeQuery.isLoading;
  const isErrorOptions = activeQuery.isError;

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
          <ErrorState description={activeQuery.error?.message} onRetry={() => void activeQuery.refetch()} />
        ) : null}

        {!isLoadingOptions && !isErrorOptions ? (
          <View className="gap-sm">
            {options.length === 0 ? (
              <EmptyState
                title={tab === 'collection' ? 'Chưa có món trong bộ sưu tập' : 'Chưa có món phù hợp'}
                description={
                  tab === 'collection'
                    ? 'Lưu món vào bộ sưu tập ở màn chi tiết công thức để chọn nhanh ở đây.'
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

      {setSlot.isError ? (
        <AppText variant="caption" color="error" accessibilityRole="alert" className="pt-sm">
          {setSlot.error.message}
        </AppText>
      ) : null}
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
