import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { MacroProgressList } from '@/features/nutrition';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList, MainTabParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { ActivityCard } from '../components/ActivityCard';
import { CalorieRingCard } from '../components/CalorieRingCard';
import { EmptyMealDashedCard } from '../components/EmptyMealDashedCard';
import { PetSnippetCard } from '../components/PetSnippetCard';
import { QuickActionGrid } from '../components/QuickActionGrid';
import { RecommendedMealCard } from '../components/RecommendedMealCard';
import { TodayMealPreviewCard } from '../components/TodayMealPreviewCard';
import { useDashboard } from '../hooks/useDashboard';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// design/Dashboard.dc.html (docs/design.md mục 14 — thứ tự section bắt buộc). "Chụp món" ở
// artboard trỏ thẳng AISnap.dc.html (link tắt của công cụ design) — bản thật đi đúng luồng
// AI Snap trong design.md mục 24: Camera → Analyzing → Review (BR-060, BR-054).
export function DashboardScreen(_props: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const user = useAuthStore(state => state.user);
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer>
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const { diary, activity, pet, recommendedMeal } = data;
  const mealsWithEntries = (['breakfast', 'lunch', 'dinner', 'snack'] as const)
    .map(mealType => ({ mealType, entries: diary.entriesByMeal[mealType] }))
    .filter(section => section.entries.length > 0);
  const emptyMealType = (['breakfast', 'lunch', 'dinner', 'snack'] as const).find(
    mealType => diary.entriesByMeal[mealType].length === 0,
  );
  const totalConsumed = Object.values(diary.entriesByMeal)
    .flat()
    .reduce((sum, entry) => sum + entry.nutrition.calories, 0);
  const totalMacros = Object.values(diary.entriesByMeal)
    .flat()
    .reduce(
      (sum, entry) => ({
        proteinG: sum.proteinG + entry.nutrition.proteinG,
        carbsG: sum.carbsG + entry.nutrition.carbsG,
        fatG: sum.fatG + entry.nutrition.fatG,
      }),
      { proteinG: 0, carbsG: 0, fatG: 0 },
    );

  return (
    <ScreenContainer scroll>
      <View className="flex-row items-center gap-sm py-xs">
        <View className="flex-1 gap-xxs">
          <AppText variant="h1">{`${greetingForHour(new Date().getHours())}, ${user?.fullName ?? 'bạn'} \u{1F44B}`}</AppText>
          <AppText variant="body" color="secondary">
            Hôm nay bạn muốn ăn gì?
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.NOTIFICATIONS)}
          className="h-[44px] w-[44px] items-center justify-center rounded-md bg-surface"
          style={{ elevation: 0 }}
        >
          <Bell size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hồ sơ"
          onPress={() =>
            navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.PROFILE })
          }
          className="h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-soft"
        >
          <AppText variant="bodyMedium" color="onPrimarySoft">
            {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
          </AppText>
        </Pressable>
      </View>

      <View className="gap-lg py-md">
        <CalorieRingCard
          consumedCalories={totalConsumed}
          calorieTarget={diary.calorieTarget}
          activityCalories={diary.activityCalories}
        />

        <MacroProgressList
          macros={[
            { label: 'Protein', consumedG: totalMacros.proteinG, targetG: diary.macroTargets.proteinG },
            { label: 'Carbs', consumedG: totalMacros.carbsG, targetG: diary.macroTargets.carbsG },
            { label: 'Fat', consumedG: totalMacros.fatG, targetG: diary.macroTargets.fatG },
          ]}
        />

        <View className="gap-md">
          <AppButton
            label="Ghi bữa ăn"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, {})}
          />
          <QuickActionGrid
            onSnap={() => navigation.navigate(MAIN_STACK_ROUTES.AI_CAMERA, { mealType: 'dinner' })}
            onVoice={() => navigation.navigate(MAIN_STACK_ROUTES.VOICE_LOG, { mealType: 'breakfast' })}
            onSearch={() => navigation.navigate(MAIN_STACK_ROUTES.FOOD_SEARCH, { mealType: 'dinner' })}
          />
        </View>

        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppText variant="h2">Bữa ăn hôm nay</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem nhật ký"
              onPress={() =>
                navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.DIARY })
              }
            >
              <AppText variant="bodyMedium" color="onPrimarySoft">
                Xem nhật ký
              </AppText>
            </Pressable>
          </View>
          {mealsWithEntries.map(section => {
            const totalCalories = section.entries.reduce(
              (sum, entry) => sum + entry.nutrition.calories,
              0,
            );
            const totalProtein = section.entries.reduce(
              (sum, entry) => sum + entry.nutrition.proteinG,
              0,
            );
            const totalCarbs = section.entries.reduce(
              (sum, entry) => sum + entry.nutrition.carbsG,
              0,
            );
            const totalFat = section.entries.reduce((sum, entry) => sum + entry.nutrition.fatG, 0);
            return (
              <TodayMealPreviewCard
                key={section.mealType}
                mealTitle={MEAL_TYPE_TITLES[section.mealType]}
                foodNames={section.entries.map(entry => entry.foodName).join(', ')}
                calories={totalCalories}
                macroLine={`P ${totalProtein}g · C ${totalCarbs}g · F ${totalFat}g`}
                onPress={() =>
                  navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.DIARY })
                }
              />
            );
          })}
          {emptyMealType ? (
            <EmptyMealDashedCard
              title={`Chưa có ${MEAL_TYPE_TITLES[emptyMealType].toLowerCase()}`}
              description="Thêm món để theo dõi đủ ngày."
              actionLabel="Ghi"
              onAction={() =>
                navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType: emptyMealType })
              }
            />
          ) : null}
        </View>

        <ActivityCard activity={activity} />

        <PetSnippetCard
          pet={pet}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PET)}
        />

        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppText variant="h2">Gợi ý bữa tối</AppText>
            {/* TODO: nối Discovery/RecipeDetail khi Đợt 5 dựng xong. */}
            <AppText variant="bodyMedium" color="onPrimarySoft" className="opacity-40">
              Xem thêm
            </AppText>
          </View>
          <RecommendedMealCard meal={recommendedMeal} />
        </View>
      </View>
    </ScreenContainer>
  );
}
