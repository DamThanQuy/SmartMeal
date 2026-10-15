import { addDays, format, subDays } from 'date-fns';
import { getIncludeActivityCalories } from '@/state/user/userProfileStore';
import type { WeeklyProgressDay, WeeklyProgressSummary } from '../types/nutrition.types';
import { calculateCalorieBudget } from '../utils/nutritionMath';
import { CURRENT_USER_DAILY_TARGET, TODAY_ACTIVITY_CALORIES_BURNED_MOCK } from './diary.mock';

// design/ProgressChart.dc.html — 7 ngày gần nhất (Thứ 2 → hôm nay), 1 ngày vượt mục tiêu.
const HISTORICAL_CALORIES = [1850, 2100, 1760, 1990, 2320, 1680];
const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function buildWeekDays(todayCalories: number, todayIso: string): WeeklyProgressDay[] {
  const startDate = subDays(new Date(todayIso), HISTORICAL_CALORIES.length);
  const historicalDays: WeeklyProgressDay[] = HISTORICAL_CALORIES.map((calories, index) => {
    const date = addDays(startDate, index);
    return {
      date: format(date, 'yyyy-MM-dd'),
      label: WEEKDAY_SHORT_LABELS[date.getDay()],
      calories,
    };
  });

  const today = new Date(todayIso);
  return [
    ...historicalDays,
    {
      date: todayIso,
      label: WEEKDAY_SHORT_LABELS[today.getDay()],
      calories: todayCalories,
      isToday: true,
    },
  ];
}

/** BR-050 — dùng cho ProgressChart (react-native-gifted-charts), tính theo `todayCalories` thật. */
export function createWeeklyProgressMock(
  todayIso: string,
  todayCalories: number,
): WeeklyProgressSummary {
  const days = buildWeekDays(todayCalories, todayIso);
  const { budget: calorieTarget } = calculateCalorieBudget({
    calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget,
    activityCaloriesBurned: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
    includeActivityCalories: getIncludeActivityCalories(),
  });
  const averageCalories = Math.round(
    days.reduce((sum, day) => sum + day.calories, 0) / days.length,
  );
  const daysOnTarget = days.filter(day => day.calories <= calorieTarget).length;

  return {
    rangeLabel: `${format(new Date(days[0].date), 'dd/MM')}–${format(
      new Date(days[days.length - 1].date),
      'dd/MM',
    )}`,
    calorieTarget,
    days,
    averageCalories,
    daysOnTarget,
    averageMacros: [
      { label: 'Protein', consumedG: 98, targetG: CURRENT_USER_DAILY_TARGET.macroTargets.proteinG },
      { label: 'Carbs', consumedG: 221, targetG: CURRENT_USER_DAILY_TARGET.macroTargets.carbsG },
      { label: 'Fat', consumedG: 61, targetG: CURRENT_USER_DAILY_TARGET.macroTargets.fatG },
    ],
  };
}

const MONTH_LENGTH_DAYS = 30;
const MONTH_LABEL_EVERY_DAYS = 5;

/** Tab "Tháng" — 30 ngày gần nhất (lặp lại số liệu mẫu của tuần, vài ngày chưa ghi = 0 kcal). */
export function createMonthlyProgressMock(
  todayIso: string,
  todayCalories: number,
): WeeklyProgressSummary {
  const today = new Date(todayIso);
  const days: WeeklyProgressDay[] = Array.from({ length: MONTH_LENGTH_DAYS }, (_, index) => {
    const date = subDays(today, MONTH_LENGTH_DAYS - 1 - index);
    const isToday = index === MONTH_LENGTH_DAYS - 1;
    const calories = isToday
      ? todayCalories
      : index % 9 === 4
        ? 0
        : HISTORICAL_CALORIES[index % HISTORICAL_CALORIES.length];
    return {
      date: format(date, 'yyyy-MM-dd'),
      label: index % MONTH_LABEL_EVERY_DAYS === 0 || isToday ? String(date.getDate()) : '',
      calories,
      isToday: isToday ? true : undefined,
    };
  });
  const { budget: calorieTarget } = calculateCalorieBudget({
    calorieTarget: CURRENT_USER_DAILY_TARGET.calorieTarget,
    activityCaloriesBurned: TODAY_ACTIVITY_CALORIES_BURNED_MOCK,
    includeActivityCalories: getIncludeActivityCalories(),
  });
  const logged = days.filter(day => day.calories > 0);

  return {
    rangeLabel: `${format(new Date(days[0].date), 'dd/MM')}–${format(today, 'dd/MM')}`,
    calorieTarget,
    days,
    averageCalories: logged.length > 0 ? Math.round(logged.reduce((sum, day) => sum + day.calories, 0) / logged.length) : 0,
    daysOnTarget: logged.filter(day => day.calories <= calorieTarget).length,
    averageMacros: [
      { label: 'Protein', consumedG: 95, targetG: CURRENT_USER_DAILY_TARGET.macroTargets.proteinG },
      { label: 'Carbs', consumedG: 228, targetG: CURRENT_USER_DAILY_TARGET.macroTargets.carbsG },
      { label: 'Fat', consumedG: 63, targetG: CURRENT_USER_DAILY_TARGET.macroTargets.fatG },
    ],
  };
}
