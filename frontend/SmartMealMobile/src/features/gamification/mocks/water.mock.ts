import type { WaterEntry } from '../types/water.types';

// design/WaterLog.dc.html — 5 ly đã ghi hôm nay (5/8 ly · 1.250/2.000 ml, khớp đúng số trong artboard).
export function createTodayWaterEntriesMock(): Omit<WaterEntry, 'id'>[] {
  return [
    { amountMl: 250, timeLabel: '07:00' },
    { amountMl: 250, timeLabel: '10:15' },
    { amountMl: 250, timeLabel: '12:40' },
    { amountMl: 250, timeLabel: '15:05' },
    { amountMl: 250, timeLabel: '17:30' },
  ];
}

// design/WaterLog.dc.html "7 ngày qua" — T2/T4/T7 đạt mục tiêu 2.000 ml (3/7 ngày, khớp badge
// "Đạt 3/7 ngày"), CN (hôm nay) tính từ dữ liệu thật ở trên, không nằm trong mảng này.
export const HISTORICAL_WATER_ML: number[] = [2000, 1500, 2000, 1200, 1750, 2000];
