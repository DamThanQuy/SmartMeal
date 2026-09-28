import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState, LoadingState } from '@/components/common';
import { AppButton, AppChip, AppIconButton, AppText } from '@/components/ui';
import { useRecipeDetail } from '@/features/recipes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_OPTIONS, getMealTypeForHour, type MealType } from '@/types/meal.types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useSetMealSlot, useWeekPlan } from '../hooks/useMealPlanner';
import { currentWeekStartIso } from '../services/mealPlannerService';

type Props = NativeStackScreenProps<MainStackParamList, 'AddToMealPlan'>;

const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Không có artboard riêng trong design/ — RecipeDetailScreen "Thêm vào thực đơn" cần chọn
// ngày + bữa trước khi gọi mealPlannerService.setSlot() (BR-160), dựng bottom sheet theo đúng
// phong cách StateAILimitScreen (transparentModal, khai báo ở MainNavigator).
export function AddToMealPlanScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const weekStartIso = currentWeekStartIso();
  const { data: recipe } = useRecipeDetail(recipeId);
  const weekPlan = useWeekPlan(weekStartIso);
  const setMealSlot = useSetMealSlot(weekStartIso);

  const [dateIso, setDateIso] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(getMealTypeForHour(new Date().getHours()));
  const [isSaved, setIsSaved] = useState(false);

  const days = weekPlan.data?.days ?? [];
  const activeDateIso = dateIso ?? days.find(day => day.dateIso === format(new Date(), 'yyyy-MM-dd'))?.dateIso ?? days[0]?.dateIso;

  const handleConfirm = () => {
    if (!activeDateIso) return;
    setMealSlot.mutate(
      { dateIso: activeDateIso, mealType, recipeId },
      { onSuccess: () => setIsSaved(true) },
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

        {isSaved ? (
          <View className="items-center gap-sm py-md">
            <View className="h-[64px] w-[64px] items-center justify-center rounded-full bg-primary-soft">
              <Check size={30} color={colors.primary} strokeWidth={3} />
            </View>
            <AppText variant="h2" className="text-center">
              Đã thêm vào thực đơn
            </AppText>
            {recipe ? (
              <AppText variant="body" color="secondary" className="text-center">
                {`${recipe.name} — ${MEAL_TYPE_OPTIONS.find(option => option.id === mealType)?.label}`}
              </AppText>
            ) : null}
            <AppButton label="Xong" onPress={() => navigation.goBack()} className="mt-sm w-full" />
          </View>
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <AppText variant="h2">Thêm vào thực đơn</AppText>
              <AppIconButton
                accessibilityLabel="Đóng"
                icon={<X size={22} color={colors.textPrimary} />}
                onPress={() => navigation.goBack()}
              />
            </View>
            {recipe ? (
              <AppText variant="body" color="secondary">
                {recipe.name}
              </AppText>
            ) : null}

            {weekPlan.isLoading ? (
              <LoadingState lines={3} />
            ) : weekPlan.isError ? (
              <ErrorState description={weekPlan.error?.message} onRetry={() => weekPlan.refetch()} />
            ) : (
              <>
                <View className="gap-sm">
                  <AppText variant="bodyMedium">Ngày</AppText>
                  <View className="flex-row justify-between">
                    {days.map((day, index) => {
                      const selected = day.dateIso === activeDateIso;
                      return (
                        <Pressable
                          key={day.dateIso}
                          accessibilityRole="button"
                          accessibilityLabel={`${WEEKDAY_SHORT_LABELS[index]} ${format(new Date(day.dateIso), 'd')}`}
                          accessibilityState={{ selected }}
                          onPress={() => setDateIso(day.dateIso)}
                          className={`min-h-[56px] flex-1 items-center justify-center gap-xxs rounded-md py-xs ${
                            selected ? 'bg-primary' : 'bg-transparent'
                          }`}
                        >
                          <AppText variant="caption" color={selected ? 'onPrimary' : 'secondary'}>
                            {WEEKDAY_SHORT_LABELS[index]}
                          </AppText>
                          <AppText variant="bodyMedium" color={selected ? 'onPrimary' : 'primary'}>
                            {format(new Date(day.dateIso), 'd')}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="gap-sm">
                  <AppText variant="bodyMedium">Bữa</AppText>
                  <View className="flex-row flex-wrap gap-xs">
                    {MEAL_TYPE_OPTIONS.map(option => (
                      <AppChip
                        key={option.id}
                        label={option.label}
                        selected={mealType === option.id}
                        onPress={() => setMealType(option.id)}
                      />
                    ))}
                  </View>
                </View>

                {setMealSlot.isError ? (
                  <AppText variant="caption" color="error">
                    {setMealSlot.error.message}
                  </AppText>
                ) : null}

                <AppButton
                  label="Thêm vào thực đơn"
                  onPress={handleConfirm}
                  loading={setMealSlot.isPending}
                  disabled={!activeDateIso}
                />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}
