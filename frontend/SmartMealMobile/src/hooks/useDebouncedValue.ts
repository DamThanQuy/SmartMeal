import { useEffect, useState } from 'react';

/**
 * Giá trị chỉ cập nhật sau khi `value` đứng yên `delayMs` — dùng cho ô tìm kiếm để không bắn một
 * request mỗi lần gõ phím.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
