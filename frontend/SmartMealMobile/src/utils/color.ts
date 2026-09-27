/**
 * Chuyển hex color (#RRGGBB) thành chuỗi kênh "R G B" — dùng để khai báo CSS variable
 * theo cú pháp NativeWind: `rgb(var(--color-x) / <alpha-value>)`.
 */
export function hexToRgbChannel(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** camelCase -> kebab-case, dùng để tạo tên CSS variable / Tailwind color key từ token key. */
export function camelToKebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
