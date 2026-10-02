/**
 * utils/date (docs/fetch-api/part1 §3.5, §4.10): ngày "yyyy-MM-dd" theo giờ máy và thời điểm UTC
 * từ BE.
 */
import {
  addDaysIso,
  formatDateIso,
  parseApiDateTime,
  parseDateIso,
  todayIso,
} from '@/utils/date';

describe('formatDateIso / todayIso', () => {
  test('theo giờ máy, không phải UTC', () => {
    // 00:30 giờ máy ngày 02/10 — nếu dùng toISOString (UTC) ở UTC+7 sẽ ra 01/10.
    const justAfterMidnight = new Date(2026, 9, 2, 0, 30);

    expect(formatDateIso(justAfterMidnight)).toBe('2026-10-02');
    expect(todayIso(justAfterMidnight)).toBe('2026-10-02');
  });

  test('đệm số 0 cho tháng/ngày một chữ số', () => {
    expect(formatDateIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseDateIso', () => {
  test('0h00 giờ máy của đúng ngày đó', () => {
    const date = parseDateIso('2026-10-02');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(2);
    expect(date.getHours()).toBe(0);
  });

  test('khứ hồi với formatDateIso', () => {
    expect(formatDateIso(parseDateIso('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('addDaysIso', () => {
  test('cộng/trừ ngày, qua ranh giới tháng và năm', () => {
    expect(addDaysIso('2026-10-02', -6)).toBe('2026-09-26');
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('parseApiDateTime', () => {
  test('chuỗi UTC có Z', () => {
    expect(parseApiDateTime('2026-10-02T03:21:11Z').toISOString()).toBe('2026-10-02T03:21:11.000Z');
  });

  test('chuỗi thiếu múi giờ vẫn hiểu là UTC (BE trả DateTime kiểu Unspecified)', () => {
    expect(parseApiDateTime('2026-10-02T03:21:11').toISOString()).toBe('2026-10-02T03:21:11.000Z');
  });

  test('phần thập phân dài của .NET (7 chữ số) và offset rõ ràng', () => {
    expect(parseApiDateTime('2026-10-02T03:21:11.1234567Z').getTime()).toBe(
      Date.UTC(2026, 9, 2, 3, 21, 11, 123),
    );
    expect(parseApiDateTime('2026-10-02T10:21:11+07:00').toISOString()).toBe(
      '2026-10-02T03:21:11.000Z',
    );
  });
});
