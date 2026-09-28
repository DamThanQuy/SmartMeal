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
