import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

/** Lỗi hạ tầng (mạng/timeout/5xx) mới đáng thử lại; 4xx và lỗi nghiệp vụ thử lại là vô nghĩa. */
const RETRYABLE_CODES: readonly string[] = ['NETWORK', 'TIMEOUT', 'SERVER'];
const MAX_RETRIES = 2;

/**
 * QueryClient dùng chung toàn app (App.tsx) — tách ra module riêng để logout/hết phiên gọi được
 * `clear()` mà không cần React context (docs/fetch-api/part1 §4.6).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        error instanceof ApiError && RETRYABLE_CODES.includes(error.code)
          ? failureCount < MAX_RETRIES
          : false,
    },
    mutations: { retry: false },
  },
});
