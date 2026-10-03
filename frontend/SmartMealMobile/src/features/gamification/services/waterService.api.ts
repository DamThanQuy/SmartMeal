import { format } from 'date-fns';
import { ENDPOINTS, api } from '@/services/api';
import type {
  LogWaterRequestDto,
  WaterHistoryDto,
  WaterSummaryDto,
} from '../types/water.api.types';
import { fromWaterHistoryToDay, fromWaterHistoryToWeek } from './water.mapper';
import type { waterMockService } from './waterService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §10): ghi/đọc/xóa từng lần uống, lịch sử nhiều ngày và
// mục tiêu nước lấy từ hồ sơ sức khỏe.

const WEEK_LENGTH_DAYS = 7;

/** GET /nutritiondiary/water?date=&days= — `days` ngày kết thúc ở `dateIso`. */
function getHistory(dateIso: string, days: number): Promise<WaterHistoryDto> {
  return api.get<WaterHistoryDto>(ENDPOINTS.nutritionDiary.water, { params: { date: dateIso, days } });
}

export const waterApiService: Partial<typeof waterMockService> = {
  async getDaySummary(dateIso) {
    return fromWaterHistoryToDay(await getHistory(dateIso, 1), dateIso);
  },

  // POST /nutritiondiary/water — response chỉ có tổng của ngày và id lần uống vừa ghi.
  async addEntry(dateIso, amountMl) {
    const summary = await api.post<WaterSummaryDto, LogWaterRequestDto>(
      ENDPOINTS.nutritionDiary.water,
      { amountMl, date: dateIso },
    );
    return { id: summary.entryId ?? '', amountMl, timeLabel: format(new Date(), 'HH:mm') };
  },

  // "Hoàn tác": BE chỉ xóa theo id nên đọc lần uống mới nhất của ngày rồi xóa nó.
  async undoLastEntry(dateIso) {
    const history = await getHistory(dateIso, 1);
    const entries = history.days.find(day => day.date === dateIso)?.entries ?? [];
    const last = entries[entries.length - 1];
    if (!last) return;
    await api.delete<WaterSummaryDto>(ENDPOINTS.nutritionDiary.waterEntry(last.id));
  },

  // DELETE /nutritiondiary/water/{id}.
  async deleteEntry(_dateIso, entryId) {
    await api.delete<WaterSummaryDto>(ENDPOINTS.nutritionDiary.waterEntry(entryId));
  },

  // 7 ngày kết thúc ở `dateIso` ("7 ngày qua").
  async getWeekSummary(dateIso) {
    return fromWaterHistoryToWeek(await getHistory(dateIso, WEEK_LENGTH_DAYS), dateIso);
  },
};
