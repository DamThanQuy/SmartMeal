// DTO của backend cho /health-sync/* (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper
// import file này.

export interface SyncHealthMetricsRequestDto {
  /** "yyyy-MM-dd"; thiếu → BE lấy ngày UTC (lệch ngày với giờ Việt Nam). */
  date?: string;
  steps: number;
  burnedCalories: number;
  distanceMeters: number;
  source: string;
}

export interface DailyHealthSyncSummaryDto {
  /** "yyyy-MM-dd". */
  date: string;
  /** BE cộng dồn MỌI lần đồng bộ trong ngày. */
  steps: number;
  stepGoal: number;
  burnedCalories: number;
  consumedCalories: number;
  netCalories: number;
  targetCalories: number;
  remainingCalories: number;
  distanceMeters: number;
  /** Chưa có log nào → ["Manual"]. */
  sources: string[];
  /** Chưa có log nào → thời điểm hiện tại (không có nghĩa là đã đồng bộ). */
  lastSyncedAt: string;
}
