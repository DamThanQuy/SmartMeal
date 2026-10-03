/**
 * water.mapper (docs/fetch-api/part1 §10): quy đổi DTO nước uống của BE → type FE. Fixture khớp
 * DTO C# (JSON camelCase).
 */
import { format } from 'date-fns';
import {
  fromWaterEntryDto,
  fromWaterHistoryToDay,
  fromWaterHistoryToWeek,
} from '@/features/gamification/services/water.mapper';
import type { WaterHistoryDto } from '@/features/gamification/types/water.api.types';

/** Giờ ghi theo GIỜ MÁY: dựng từ Date cục bộ để test không phụ thuộc múi giờ của máy chạy test. */
function localIso(hour: number, minute: number): string {
  return new Date(2026, 9, 3, hour, minute).toISOString();
}

describe('fromWaterEntryDto', () => {
  test('giờ ghi hiển thị theo giờ máy ("HH:mm")', () => {
    expect(fromWaterEntryDto({ id: 'w1', amountMl: 250, createdAt: localIso(10, 15) })).toEqual({
      id: 'w1',
      amountMl: 250,
      timeLabel: '10:15',
    });
  });

  test('thời điểm thiếu múi giờ vẫn được hiểu là UTC', () => {
    const expected = format(new Date(Date.UTC(2026, 9, 3, 3, 15)), 'HH:mm');

    expect(
      fromWaterEntryDto({ id: 'w1', amountMl: 250, createdAt: '2026-10-03T03:15:00' }).timeLabel,
    ).toBe(expected);
  });

  test('thời điểm hỏng → nhãn giờ để trống, không làm hỏng cả danh sách', () => {
    expect(
      fromWaterEntryDto({ id: 'w1', amountMl: 250, createdAt: 'khong-phai-ngay' }),
    ).toEqual({ id: 'w1', amountMl: 250, timeLabel: '' });
  });
});

describe('fromWaterHistoryToDay', () => {
  const history: WaterHistoryDto = {
    goalMl: 2400,
    days: [
      {
        date: '2026-10-03',
        totalMl: 750,
        entries: [
          { id: 'a', amountMl: 250, createdAt: localIso(7, 0) },
          { id: 'b', amountMl: 500, createdAt: localIso(9, 30) },
        ],
      },
    ],
  };

  test('tổng, mục tiêu và các lần uống theo thứ tự BE trả (cũ → mới)', () => {
    expect(fromWaterHistoryToDay(history, '2026-10-03')).toEqual({
      dateIso: '2026-10-03',
      totalMl: 750,
      goalMl: 2400,
      entries: [
        { id: 'a', amountMl: 250, timeLabel: '07:00' },
        { id: 'b', amountMl: 500, timeLabel: '09:30' },
      ],
    });
  });

  test('ngày không có trong lịch sử → chưa uống gì nhưng vẫn có mục tiêu', () => {
    expect(fromWaterHistoryToDay({ goalMl: 2000, days: [] }, '2026-10-03')).toEqual({
      dateIso: '2026-10-03',
      totalMl: 0,
      goalMl: 2000,
      entries: [],
    });
  });
});

describe('fromWaterHistoryToWeek', () => {
  // 26/09/2026 là thứ Bảy → 02/10/2026 là thứ Sáu.
  const dates = [
    '2026-09-26',
    '2026-09-27',
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
  ];
  const totals = [0, 2000, 1500, 2000, 1200, 1750, 500];
  const history: WaterHistoryDto = {
    goalMl: 2000,
    days: dates.map((date, index) => ({ date, totalMl: totals[index], entries: [] })),
  };

  test('nhãn thứ tính từ ngày (BE chỉ trả ngày), đánh dấu hôm nay', () => {
    const week = fromWaterHistoryToWeek(history, '2026-10-02');

    expect(week.days.map(day => day.dateIso)).toEqual([
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(week.days.map(day => day.label)).toEqual(['T7', 'CN', 'T2', 'T3', 'T4', 'T5', 'T6']);
    expect(week.days.map(day => day.isToday)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    ]);
  });

  test('mục tiêu hiện tại của hồ sơ áp cho mọi ngày; "Đạt n/7 ngày" đếm ngày ≥ mục tiêu', () => {
    const week = fromWaterHistoryToWeek(history, '2026-10-02');

    expect(week.days.every(day => day.goalMl === 2000)).toBe(true);
    expect(week.daysOnTarget).toBe(2);
  });

  test('chưa có ngày nào → rỗng, không ném lỗi', () => {
    expect(fromWaterHistoryToWeek({ goalMl: 2000, days: [] }, '2026-10-02')).toEqual({
      days: [],
      daysOnTarget: 0,
    });
  });
});
