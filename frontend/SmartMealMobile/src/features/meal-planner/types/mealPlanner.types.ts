import type { MealType } from '@/types/meal.types';

// BR-160 — Weekly Meal Plan: lên kế hoạch từng bữa trong tuần theo mục tiêu dinh dưỡng + an
// toàn (dị ứng/bệnh lý). design/MealPlanner.dc.html, SlotPicker.dc.html.

export interface PlannedMealSlot {
  recipeId: string;
  recipeName: string;
  durationMinutes: number;
  calories: number;
}

export type DayMealPlan = Record<MealType, PlannedMealSlot | null>;

export interface DayPlanSummary {
  /** ISO date yyyy-MM-dd. */
  dateIso: string;
  meals: DayMealPlan;
  plannedCalories: number;
}

export interface WeekPlan {
  /** ISO date yyyy-MM-dd của Thứ 2 đầu tuần. */
  weekStartIso: string;
  /** 7 ngày Thứ 2 → Chủ nhật. */
  days: DayPlanSummary[];
  /** Cùng nguồn CURRENT_USER_DAILY_TARGET với Dashboard/Diary/ProgressChart (BR-022). */
  calorieTarget: number;
}

export type SlotSuggestionTab = 'suggested' | 'favorite' | 'collection';

export interface SlotSuggestionOption {
  recipeId: string;
  recipeName: string;
  durationMinutes: number;
  calories: number;
  /** Nhãn lý do gợi ý, vd. "Giàu protein", "Phù hợp Eat Clean" — design/SlotPicker.dc.html. */
  reasonLabel: string;
}
