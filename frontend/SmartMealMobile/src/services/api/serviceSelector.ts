import { ENV } from '@/config/env';

const warnedFallbacks = new Set<string>();

function warnMockFallback(label: string): void {
  if (warnedFallbacks.has(label)) return;
  warnedFallbacks.add(label);
  console.warn(`[mock] ${label} chưa nối API thật — đang dùng dữ liệu giả lập.`);
}

/**
 * Chọn implementation cho 1 feature service ("mock fallback", docs/fetch-api/part1 §4.9):
 *
 * - `ENV.useMockApi = true`  → toàn bộ hàm dùng `mock` (demo/test không cần backend).
 * - `ENV.useMockApi = false` → hàm nào có trong `api` thì gọi API thật, hàm còn lại tự rơi về
 *   `mock` (BE chưa hỗ trợ — xem mục "Mock-only registry" trong docs/fetch-api). Ở chế độ dev có
 *   `console.warn` 1 lần cho mỗi hàm rơi về mock để biết còn chỗ nào chưa nối.
 *
 * `T` suy ra từ object mock nên hàm mới thêm vào API phải có bản mock cùng chữ ký — hook/screen
 * vẫn import `xxxService` như cũ, không phải sửa.
 */
export function selectService<T extends object>(name: string, mock: T, api: Partial<T>): T {
  if (ENV.useMockApi) return mock;

  const fallbacks: Record<string, unknown> = {};
  if (__DEV__) {
    for (const [key, value] of Object.entries(mock)) {
      if (typeof value === 'function' && !(key in api)) {
        fallbacks[key] = (...args: unknown[]) => {
          warnMockFallback(`${name}.${key}`);
          return (value as (...callArgs: unknown[]) => unknown)(...args);
        };
      }
    }
  }

  return { ...mock, ...fallbacks, ...api } as T;
}
