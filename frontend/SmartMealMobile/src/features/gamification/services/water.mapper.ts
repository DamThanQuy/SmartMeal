import { format } from 'date-fns';
import { parseApiDateTime, parseDateIso } from '@/utils/date';
import type { WaterEntryDto, WaterHistoryDto } from '../types/water.api.types';
import type { WaterDaySummary, WaterEntry, WaterWeekSummary } from '../types/water.types';

// Hàm thuần quy đổi DTO nước uống của backend → type FE (docs/fetch-api/part1 §10). Không gọi API,
// không đọc store — để test bằng fixture JSON.

/** date-fns Date.getDay(): 0=CN...6=T7. */
const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Giờ ghi theo giờ máy ("10:15"); thời điểm hỏng → để trống thay vì làm hỏng cả danh sách. */
export function fromWaterEntryDto(dto: WaterEntryDto): WaterEntry {
  const drankAt = parseApiDateTime(dto.createdAt);
  return {
    id: dto.id,
    amountMl: dto.amountMl,
    timeLabel: Number.isNaN(drankAt.getTime()) ? '' : format(drankAt, 'HH:mm'),
  };
}

/** Lịch sử 1 ngày (days=1) → tổng kết ngày; ngày không có trong lịch sử = chưa uống gì. */
export function fromWaterHistoryToDay(history: WaterHistoryDto, dateIso: string): WaterDaySummary {
  const day = history.days.find(item => item.date === dateIso);
  return {
    dateIso,
    entries: (day?.entries ?? []).map(fromWaterEntryDto),
    totalMl: day?.totalMl ?? 0,
    goalMl: history.goalMl,
  };
}

/**
 * Lịch sử 7 ngày kết thúc ở hôm nay → "7 ngày qua". Nhãn thứ tính từ ngày (BE chỉ trả ngày); mục
 * tiêu là mục tiêu hiện tại của hồ sơ cho mọi ngày.
 */
export function fromWaterHistoryToWeek(
  history: WaterHistoryDto,
  todayDateIso: string,
): WaterWeekSummary {
  const days = history.days.map(day => ({
    dateIso: day.date,
    label: WEEKDAY_SHORT_LABELS[parseDateIso(day.date).getDay()],
    totalMl: day.totalMl,
    goalMl: history.goalMl,
    isToday: day.date === todayDateIso ? true : undefined,
  }));
  return { days, daysOnTarget: days.filter(day => day.totalMl >= day.goalMl).length };
}
