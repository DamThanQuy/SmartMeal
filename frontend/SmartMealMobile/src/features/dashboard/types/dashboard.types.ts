import type { DiaryDaySummary } from '@/features/nutrition';

export interface ActivitySummary {
  steps: number;
  caloriesBurned: number;
  /** Nhãn giờ đồng bộ gần nhất, vd. "08:30" — design/Dashboard.dc.html mục Vận động. */
  syncedAtLabel: string;
}

export interface PetSnippet {
  name: string;
  level: number;
  streakDays: number;
  progressPercent: number;
  message: string;
}

export interface RecommendedMeal {
  name: string;
  durationMinutes: number;
  calories: number;
  tag: string;
}

export interface DashboardSummary {
  diary: DiaryDaySummary;
  activity: ActivitySummary;
  pet: PetSnippet;
  recommendedMeal: RecommendedMeal;
}
