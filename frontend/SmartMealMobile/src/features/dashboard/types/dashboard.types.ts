import type { DiaryDaySummary } from '@/features/nutrition';

export interface ActivitySummary {
  steps: number;
  caloriesBurned: number;
  /** Nhãn giờ đồng bộ gần nhất (giờ máy), vd. "08:30" — design/Dashboard.dc.html mục Vận động.
   * null khi hôm nay chưa đồng bộ lần nào (không được hiện "vừa đồng bộ"). */
  syncedAtLabel: string | null;
  /** Tên các nguồn đã đồng bộ, vd. "Health Connect"; rỗng khi chưa đồng bộ. */
  sourceLabel: string;
}

export interface PetSnippet {
  name: string;
  level: number;
  streakDays: number;
  progressPercent: number;
  message: string;
}

export interface RecommendedMeal {
  recipeId: string;
  name: string;
  durationMinutes: number;
  calories: number;
  tag: string;
}

/**
 * Dashboard gom từ nhiều nguồn: chỉ nhật ký (diary) lỗi mới làm hỏng cả màn; vận động và Bé Mầm
 * lỗi thì khối đó được ẩn (null) chứ không kéo cả Dashboard xuống (docs/fetch-api/part1 §8).
 */
export interface DashboardSummary {
  diary: DiaryDaySummary;
  activity: ActivitySummary | null;
  pet: PetSnippet | null;
  recommendedMeal: RecommendedMeal;
}
