// DTO của backend cho /health-sync/* (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper
// import file này.
import type { HealthSyncSource } from './healthSync.types';

/**
 * POST /health-sync/steps-and-calories — gửi TỔNG của một ngày từ một nguồn. Gửi lại cùng
 * (ngày, nguồn) thay thế giá trị cũ, không cộng dồn: gửi lặp không bao giờ làm số liệu nhân đôi.
 */
export interface SyncHealthMetricsRequestDto {
  /** "yyyy-MM-dd"; thiếu → BE lấy ngày UTC (lệch ngày với giờ Việt Nam). */
  date?: string;
  /** 0–200000. */
  steps: number;
  /** 0–20000. */
  burnedCalories: number;
  /** 0–500000. */
  distanceMeters: number;
  source: HealthSyncSource;
}

export interface DailyHealthSyncSummaryDto {
  /** "yyyy-MM-dd". */
  date: string;
  /** Số liệu của nguồn ưu tiên cao nhất có dữ liệu trong ngày (`activeSource`), không cộng các nguồn. */
  steps: number;
  stepGoal: number;
  burnedCalories: number;
  consumedCalories: number;
  netCalories: number;
  targetCalories: number;
  remainingCalories: number;
  distanceMeters: number;
  /** Các nguồn đã có dữ liệu trong ngày (ưu tiên giảm dần); chưa đồng bộ gì → rỗng. */
  sources: string[];
  /** Nguồn đang được dùng; null khi chưa có dữ liệu. */
  activeSource: string | null;
  /** Lần đồng bộ gần nhất trong ngày; null khi chưa từng đồng bộ ngày này. */
  lastSyncedAt: string | null;
}
