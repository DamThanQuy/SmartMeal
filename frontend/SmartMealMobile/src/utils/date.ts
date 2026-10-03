import { addDays, format, parseISO } from 'date-fns';

// Ngày giờ giữa FE ↔ backend (docs/fetch-api/part1 §3.5): ngày (`DateOnly`) là chuỗi
// "yyyy-MM-dd" theo GIỜ MÁY; thời điểm (`DateTime`) là ISO 8601 UTC.

/**
 * "yyyy-MM-dd" theo giờ máy. KHÔNG dùng `date.toISOString().slice(0, 10)`: đó là ngày UTC, lệch
 * một ngày với giờ Việt Nam (UTC+7) từ 00:00 đến 07:00.
 */
export function formatDateIso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayIso(now: Date = new Date()): string {
  return formatDateIso(now);
}

/** "yyyy-MM-dd" → Date lúc 00:00 giờ máy (`new Date('yyyy-MM-dd')` lại hiểu là 00:00 UTC). */
export function parseDateIso(dateIso: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysIso(dateIso: string, amount: number): string {
  return formatDateIso(addDays(parseDateIso(dateIso), amount));
}

/**
 * Thời điểm (DateTime) từ BE → Date. BE trả UTC; chuỗi thiếu hậu tố múi giờ (Z hoặc ±hh:mm) vẫn
 * được hiểu là UTC thay vì giờ máy.
 */
export function parseApiDateTime(value: string): Date {
  const timePart = value.split('T')[1];
  const hasTimeZone = timePart !== undefined && /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(timePart);
  return parseISO(timePart === undefined || hasTimeZone ? value : `${value}Z`);
}
