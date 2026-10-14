// DTO của backend cho nước uống (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper import
// file này, hook/screen chỉ biết type FE trong water.types.ts.

/** POST /nutritiondiary/water — ghi một lần uống. */
export interface LogWaterRequestDto {
  /** 1–5000 ml. */
  amountMl: number;
  /** "yyyy-MM-dd" theo giờ máy; bỏ trống = hôm nay (UTC). */
  date?: string;
}

/** Tổng nước của một ngày; kèm id của lần uống vừa ghi/xóa. */
export interface WaterSummaryDto {
  /** Id lần uống vừa ghi (POST) — dùng cho "Hoàn tác" qua DELETE. */
  entryId: string | null;
  date: string;
  totalWaterMl: number;
  goalWaterMl: number;
  percentage: number;
}

export interface WaterEntryDto {
  id: string;
  amountMl: number;
  /** Thời điểm uống (ISO 8601 UTC). */
  createdAt: string;
}

export interface WaterDayDto {
  date: string;
  totalMl: number;
  /** Cũ → mới. */
  entries: WaterEntryDto[];
}

/** GET /nutritiondiary/water?date=&days= — `days` ngày kết thúc ở `date` (tăng dần, gồm ngày trống). */
export interface WaterHistoryDto {
  /** Mục tiêu nước/ngày hiện tại trong hồ sơ sức khỏe (500–10000 ml). */
  goalMl: number;
  days: WaterDayDto[];
}
