import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Bell,
  ChevronRight,
  Leaf,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppButton, AppCard, AppIconButton, AppText } from '@/components/ui';
import { useAiQuotaStore } from '@/features/ai';
import { MacroStatGrid } from '@/features/nutrition';
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

// Trang chủ theo ảnh tham chiếu; các chức năng ghi bữa ăn và theo dõi vẫn nằm bên dưới.
export function DashboardScreen(_props: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, resolvedScheme, setMode } = useTheme();
  const user = useAuthStore(state => state.user);
  const micPermissionGranted = useAiQuotaStore(
    state => state.micPermissionGranted,
  );
  const { data, isLoading, isError, error, refetch } = useDashboard();

  const now = new Date();
  const dateLabel = format(now, "EEEE, dd 'tháng' MM", { locale: vi });
  const fullName = user?.fullName?.trim() || 'bạn';
  const nameParts = fullName.split(/\s+/);
  const givenName = nameParts[nameParts.length - 1];
  const firstName = givenName.charAt(0).toUpperCase() + givenName.slice(1);
  const initials = (
    nameParts.length > 1
      ? nameParts[0].charAt(0) + givenName.charAt(0)
      : givenName.slice(0, 2)
  ).toUpperCase();
  const openDiary = () =>
    navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
      screen: MAIN_TAB_ROUTES.DIARY,
    });
  const openDiscovery = () =>
    navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
      screen: MAIN_TAB_ROUTES.DISCOVER,
    });
  const header = (
    <View className="flex-row items-center justify-between border-b border-border px-md py-xs">
      <View className="flex-row items-center gap-xs">
        <View className="h-[32px] w-[32px] items-center justify-center rounded-md bg-primary-soft">
          <Leaf size={22} color={colors.primary} strokeWidth={2.2} />
        </View>
        <AppText variant="h3" className="font-sans-bold">
          SmartMeal
        </AppText>
      </View>
      <View className="flex-row items-center">
        <AppIconButton
          accessibilityLabel={
            resolvedScheme === 'dark'
              ? 'Chuyển sang giao diện sáng'
              : 'Chuyển sang giao diện tối'
          }
          icon={
            resolvedScheme === 'dark' ? (
              <Sun size={20} color={colors.textSecondary} />
            ) : (
              <Moon size={20} color={colors.textSecondary} />
            )
          }
          onPress={() => setMode(resolvedScheme === 'dark' ? 'light' : 'dark')}
        />
        <AppIconButton
          accessibilityLabel="Thông báo"
          icon={<Bell size={20} color={colors.textSecondary} />}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.NOTIFICATIONS)}
        />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer header={header}>
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer header={header}>
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const { diary, activity, pet, recommendedMeal, recommendedMeals } = data;
  const mealsWithEntries = (['breakfast', 'lunch', 'dinner', 'snack'] as const)
    .map(mealType => ({ mealType, entries: diary.entriesByMeal[mealType] }))
    .filter(section => section.entries.length > 0);
  const emptyMealType = (
    ['breakfast', 'lunch', 'dinner', 'snack'] as const
  ).find(mealType => diary.entriesByMeal[mealType].length === 0);
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
    <ScreenContainer scroll edges={['top', 'left', 'right']} header={header}>
      <View className="flex-row items-center gap-sm pb-xl pt-lg">
        <View className="flex-1 gap-xxs">
          <AppText variant="caption" color="secondary">
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
          </AppText>
          <AppText variant="h1">{`${greetingForHour(now.getHours())}, ${firstName}!`}</AppText>
          <AppText variant="body" color="secondary">
            Hôm nay mình ăn uống lành mạnh nhé.
          </AppText>
        </View>
        <AppIconButton
          accessibilityLabel="Hồ sơ"
          variant="soft"
          icon={
            <AppText variant="bodyMedium" color="onPrimarySoft">
              {initials}
            </AppText>
          }
          onPress={() =>
            navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
              screen: MAIN_TAB_ROUTES.PROFILE,
            })
          }
        />
      </View>

      <View className="gap-xl">
        <CalorieRingCard
          consumedCalories={totalConsumed}
          calorieTarget={diary.calorieTarget}
          activityCalories={diary.activityCalories}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.CALORIE_BUDGET)}
        />

        <View className="gap-xs">
          <View className="flex-row items-center justify-between gap-xs">
            <AppText variant="bodyLg" className="font-sans-bold">
              Tổng quan dinh dưỡng
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chi tiết dinh dưỡng"
              onPress={openDiary}
              className="min-h-[44px] flex-row items-center gap-xxs"
            >
              <AppText variant="caption" color="onPrimarySoft">
                Chi tiết
              </AppText>
              <ChevronRight size={16} color={colors.onPrimarySoft} />
            </Pressable>
          </View>
          <MacroStatGrid
            proteinG={totalMacros.proteinG}
            carbsG={totalMacros.carbsG}
            fatG={totalMacros.fatG}
            targets={diary.macroTargets}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mẹo nhỏ hôm nay: khám phá món ăn"
          onPress={openDiscovery}
        >
          <AppCard variant="outlined" className="flex-row items-center gap-sm">
            <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-warning-soft">
              <Sparkles size={22} color={colors.warningText} />
            </View>
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyMedium">Mẹo nhỏ hôm nay</AppText>
              <AppText variant="caption" color="secondary">
                Thêm rau xanh vào bữa trưa để đủ chất xơ.
              </AppText>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </AppCard>
        </Pressable>

        <View className="gap-xs">
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyLg" className="font-sans-bold">
              Gợi ý cho bạn
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem tất cả gợi ý món ăn"
              onPress={openDiscovery}
              className="min-h-[44px] flex-row items-center gap-xxs"
            >
              <AppText variant="caption" color="onPrimarySoft">
                Xem tất cả
              </AppText>
              <ChevronRight size={16} color={colors.onPrimarySoft} />
            </Pressable>
          </View>
          <View className="flex-row gap-sm">
            {(recommendedMeals ?? [recommendedMeal]).slice(0, 2).map(meal => (
              <RecommendedMealCard
                key={meal.recipeId}
                meal={meal}
                onPress={() =>
                  navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, {
                    recipeId: meal.recipeId,
                  })
                }
              />
            ))}
          </View>
        </View>

        <View className="gap-md">
          <AppButton
            label="Ghi bữa ăn"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, {})}
          />
          <QuickActionGrid
            onSnap={() =>
              navigation.navigate(MAIN_STACK_ROUTES.AI_CAMERA, {
                mealType: 'dinner',
              })
            }
            onVoice={() =>
              navigation.navigate(
                micPermissionGranted
                  ? MAIN_STACK_ROUTES.VOICE_LOG
                  : MAIN_STACK_ROUTES.VOICE_PERMISSION,
                { mealType: 'breakfast' },
              )
            }
            onSearch={() =>
              navigation.navigate(MAIN_STACK_ROUTES.FOOD_SEARCH, {
                mealType: 'dinner',
              })
            }
          />
        </View>

        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppText variant="h2">Bữa ăn hôm nay</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem nhật ký"
              onPress={() =>
                navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
                  screen: MAIN_TAB_ROUTES.DIARY,
                })
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
            const totalFat = section.entries.reduce(
              (sum, entry) => sum + entry.nutrition.fatG,
              0,
            );
            return (
              <TodayMealPreviewCard
                key={section.mealType}
                mealTitle={MEAL_TYPE_TITLES[section.mealType]}
                foodNames={section.entries
                  .map(entry => entry.foodName)
                  .join(', ')}
                calories={totalCalories}
                macroLine={`P ${totalProtein}g · C ${totalCarbs}g · F ${totalFat}g`}
                onPress={() =>
                  navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
                    screen: MAIN_TAB_ROUTES.DIARY,
                  })
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
                navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, {
                  mealType: emptyMealType,
                })
              }
            />
          ) : null}
        </View>

        {activity ? <ActivityCard activity={activity} /> : null}

        {pet ? (
          <PetSnippetCard
            pet={pet}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PET)}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
