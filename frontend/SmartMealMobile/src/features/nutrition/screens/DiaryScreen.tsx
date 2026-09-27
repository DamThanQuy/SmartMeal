import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, SuccessToast } from '@/components/common';
import { AppCard, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList, MainTabParamList } from '@/navigation/types';
import { MEAL_TYPES, type MealType } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { DiaryMealSection } from '../components/DiaryMealSection';
import { useDiaryDay } from '../hooks/useDiary';
import { todayIso } from '../services/nutritionService';

type Props = BottomTabScreenProps<MainTabParamList, 'Diary'>;

const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// design/Diary.dc.html (BR-050→BR-054). Tab "Nhật ký" — navigate() ở đây escape sang
// MainStackParamList (QuickLog/EditMealLog/ProgressChart nằm ngoài MainTabParamList).
export function DiaryScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Theo dõi giá trị route.params.toast đã xử lý — cho phép "điều chỉnh state khi prop đổi"
  // ngay trong lúc render (React khuyến nghị cách này thay vì gọi setState đồng bộ trong
  // effect — react-hooks/set-state-in-effect).
  const [handledToastParam, setHandledToastParam] = useState<string | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incomingToast = route.params?.toast;
  if (incomingToast && incomingToast !== handledToastParam) {
    setHandledToastParam(incomingToast);
    setToastMessage(incomingToast);
  }

  const dateIso = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateIso === todayIso();
  const { data: diary, isLoading, isError, error, refetch } = useDiaryDay(dateIso);

  useEffect(() => {
    if (!toastMessage) return;
    navigation.setParams({ toast: undefined });
    toastTimer.current = setTimeout(() => setToastMessage(null), 2600);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toastMessage, navigation]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const goToQuickLog = (mealType?: MealType) =>
    navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType });

  return (
    <ScreenContainer>
      <View className="flex-row items-center gap-sm py-xs">
        <AppText variant="h1" className="flex-1">
          Nhật ký
        </AppText>
        <AppIconButton
          accessibilityLabel="Biểu đồ tiến độ"
          variant="elevated"
          shape="square"
          icon={<BarChart3 size={22} color={colors.textPrimary} />}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PROGRESS_CHART)}
        />
        <AppIconButton
          accessibilityLabel="Ghi bữa ăn"
          shape="square"
          icon={<Plus size={22} color={colors.onPrimary} />}
          className="bg-primary"
          onPress={() => goToQuickLog()}
        />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg pb-xxxl">
        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppIconButton
              accessibilityLabel="Tuần trước"
              icon={<ChevronLeft size={22} color={colors.textPrimary} />}
              onPress={() => setSelectedDate(current => addDays(current, -7))}
            />
            <AppText variant="bodyMedium">
              {isToday ? `Hôm nay, ${format(selectedDate, 'dd/MM')}` : format(selectedDate, 'dd/MM/yyyy')}
            </AppText>
            <AppIconButton
              accessibilityLabel="Tuần sau"
              icon={<ChevronRight size={22} color={colors.textPrimary} />}
              onPress={() => setSelectedDate(current => addDays(current, 7))}
            />
          </View>
          <View className="flex-row justify-between">
            {weekDays.map(day => {
              const selected = isSameDay(day, selectedDate);
              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'dd/MM')}
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedDate(day)}
                  className={`min-h-[56px] flex-1 items-center gap-xxs rounded-md py-xs ${
                    selected ? 'bg-primary' : 'bg-transparent'
                  }`}
                >
                  <AppText variant="caption" color={selected ? 'onPrimary' : 'primary'}>
                    {WEEKDAY_SHORT_LABELS[day.getDay()]}
                  </AppText>
                  <AppText variant="bodyMedium" color={selected ? 'onPrimary' : 'primary'}>
                    {format(day, 'd')}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <LoadingState lines={6} />
        ) : isError ? (
          <ErrorState description={error.message} onRetry={refetch} />
        ) : diary ? (
          <>
            <AppCard className="gap-sm">
              <View className="flex-row items-baseline justify-between">
                <AppText variant="body" color="secondary">
                  Đã nạp
                </AppText>
                <AppText variant="body" color="secondary">
                  <AppText variant="h2">
                    {Object.values(diary.entriesByMeal)
                      .flat()
                      .reduce((sum, entry) => sum + entry.nutrition.calories, 0)
                      .toLocaleString('vi-VN')}
                  </AppText>
                  {` / ${(diary.calorieTarget + diary.activityCalories).toLocaleString('vi-VN')} kcal`}
                </AppText>
              </View>
              <DiaryOverviewBar diary={diary} />
            </AppCard>

            {MEAL_TYPES.map(mealType => (
              <DiaryMealSection
                key={mealType}
                mealType={mealType}
                entries={diary.entriesByMeal[mealType]}
                onAdd={() => goToQuickLog(mealType)}
                onEditEntry={logId => navigation.navigate(MAIN_STACK_ROUTES.EDIT_MEAL_LOG, { logId })}
              />
            ))}
          </>
        ) : null}
      </ScrollView>

      {toastMessage ? <SuccessToast message={toastMessage} /> : null}
    </ScreenContainer>
  );
}

interface DiaryOverviewBarProps {
  diary: NonNullable<ReturnType<typeof useDiaryDay>['data']>;
}

function DiaryOverviewBar({ diary }: DiaryOverviewBarProps) {
  const allEntries = Object.values(diary.entriesByMeal).flat();
  const consumed = {
    calories: allEntries.reduce((sum, entry) => sum + entry.nutrition.calories, 0),
    proteinG: allEntries.reduce((sum, entry) => sum + entry.nutrition.proteinG, 0),
    carbsG: allEntries.reduce((sum, entry) => sum + entry.nutrition.carbsG, 0),
    fatG: allEntries.reduce((sum, entry) => sum + entry.nutrition.fatG, 0),
  };
  const target = diary.calorieTarget + diary.activityCalories;
  const percent = target > 0 ? Math.min(consumed.calories / target, 1) : 0;

  return (
    <>
      <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
        <View className="h-[8px] rounded-pill bg-primary" style={{ width: `${percent * 100}%` }} />
      </View>
      <View className="flex-row justify-between">
        <AppText variant="caption" color="secondary">{`P ${consumed.proteinG}/${diary.macroTargets.proteinG}g`}</AppText>
        <AppText variant="caption" color="secondary">{`C ${consumed.carbsG}/${diary.macroTargets.carbsG}g`}</AppText>
        <AppText variant="caption" color="secondary">{`F ${consumed.fatG}/${diary.macroTargets.fatG}g`}</AppText>
      </View>
    </>
  );
}
