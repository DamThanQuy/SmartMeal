import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppButton, AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { todayIso } from '@/features/nutrition';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES, MEAL_TYPES, type MealType } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { MealSlotSection } from '../components/MealSlotSection';
import { useAutoFillWeek, useWeekPlan } from '../hooks/useMealPlanner';
import { shiftWeek } from '../services/mealPlannerService';

const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_FULL_LABELS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
];

export interface MealPlannerScreenProps {
  weekStartIso: string;
  onChangeWeek: (weekStartIso: string) => void;
  onOpenGrocery: () => void;
}

// design/MealPlanner.dc.html (BR-160). Là tab con của MAIN_TAB_ROUTES.PLANNER (toggle cục bộ
// với GroceryScreen qua AppSegmentedControl — xem MainTabNavigator), không phải Stack.Screen
// riêng nên không có route/navigation props chuẩn — chỉ cần điều hướng sang màn ngoài tab
// (SlotPicker, RecipeDetail) qua useNavigation<MainStackParamList> giống DashboardScreen.
export function MealPlannerScreen({
  weekStartIso,
  onChangeWeek,
  onOpenGrocery,
}: MealPlannerScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso());
  const { data, isLoading, isError, error, refetch } = useWeekPlan(weekStartIso);
  const autoFillWeek = useAutoFillWeek(weekStartIso);

  const handleShiftWeek = (direction: 1 | -1) => {
    const nextWeek = shiftWeek(weekStartIso, direction);
    onChangeWeek(nextWeek);
    setSelectedDateIso(nextWeek);
  };

  const openSlotPicker = (dateIso: string, mealType: MealType) => {
    navigation.navigate(MAIN_STACK_ROUTES.SLOT_PICKER, { weekStartIso, dateIso, mealType });
  };

  if (isLoading) {
    return (
      <ScreenContainer scroll>
        <LoadingState lines={10} />
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

  const selectedDay = data.days.find(day => day.dateIso === selectedDateIso) ?? data.days[0];
  const selectedDayIndex = data.days.findIndex(day => day.dateIso === selectedDay.dateIso);
  const selectedDateLabel = WEEKDAY_FULL_LABELS[selectedDayIndex] ?? '';
  const progressPercent = Math.min(
    100,
    Math.round((selectedDay.plannedCalories / data.calorieTarget) * 100),
  );
  const weekEndIso = data.days[6].dateIso;

  return (
    <ScreenContainer scroll contentContainerClassName="gap-lg">
      <View className="gap-md py-xs">
        <AppText variant="h1">Thực đơn</AppText>
        <AppSegmentedControl
          options={[
            { id: 'planner', label: 'Thực đơn' },
            { id: 'grocery', label: 'Đi chợ' },
          ]}
          value="planner"
          onChange={value => {
            if (value === 'grocery') onOpenGrocery();
          }}
        />
      </View>

      <View className="gap-sm">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tuần trước"
            hitSlop={8}
            onPress={() => handleShiftWeek(-1)}
            className="h-[44px] w-[44px] items-center justify-center rounded-md"
          >
            <ChevronLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <View className="items-center">
            <AppText variant="bodyMedium">
              {`${format(new Date(weekStartIso), 'dd/MM')} — ${format(new Date(weekEndIso), 'dd/MM')}`}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tuần sau"
            hitSlop={8}
            onPress={() => handleShiftWeek(1)}
            className="h-[44px] w-[44px] items-center justify-center rounded-md"
          >
            <ChevronRight size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View className="flex-row justify-between">
          {data.days.map((day, index) => {
            const selected = day.dateIso === selectedDateIso;
            return (
              <Pressable
                key={day.dateIso}
                accessibilityRole="button"
                accessibilityLabel={`${WEEKDAY_SHORT_LABELS[index]} ${format(new Date(day.dateIso), 'd')}`}
                accessibilityState={{ selected }}
                onPress={() => setSelectedDateIso(day.dateIso)}
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

      <AppCard className="gap-sm">
        <View className="flex-row items-center justify-between">
          <AppText variant="body" color="secondary">
            {`Đã lên kế hoạch · ${selectedDateLabel}`}
          </AppText>
          <AppText variant="bodyMedium">
            {selectedDay.plannedCalories}
            <AppText variant="body" color="secondary">{` / ${data.calorieTarget} kcal`}</AppText>
          </AppText>
        </View>
        <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
          <View className="h-[8px] rounded-pill bg-primary" style={{ width: `${progressPercent}%` }} />
        </View>
      </AppCard>

      {MEAL_TYPES.map(mealType => (
        <AppCard key={mealType}>
          <MealSlotSection
            mealTitle={MEAL_TYPE_TITLES[mealType]}
            slot={selectedDay.meals[mealType]}
            onPressChange={() => openSlotPicker(selectedDay.dateIso, mealType)}
          />
        </AppCard>
      ))}

      <View className="gap-md">
        <AppButton
          label="Gợi ý thực đơn tuần bằng AI"
          variant="secondary"
          loading={autoFillWeek.isPending}
          onPress={() => autoFillWeek.mutate()}
        />
        <AppButton label="Tạo danh sách đi chợ" onPress={onOpenGrocery} />
      </View>
    </ScreenContainer>
  );
}
