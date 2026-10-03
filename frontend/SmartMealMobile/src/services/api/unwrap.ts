import type { AxiosResponse } from 'axios';
import type { ApiEnvelope } from '@/types/api';
import { ApiError, isApiEnvelope } from './errors';

/**
 * Bóc `data` khỏi envelope của BE. Luôn kiểm tra `success`, không chỉ HTTP status — có endpoint
 * trả HTTP 200 kèm `success:false` (vd. suggest-by-pantry khi danh sách rỗng, activate-mock khi
 * không thấy user — docs/fetch-api/part1 §3.2).
 */
export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  const body: unknown = response.data;
  if (!isApiEnvelope(body)) {
    throw new ApiError('Phản hồi từ máy chủ không hợp lệ.', 'UNKNOWN', response.status);
  }
  if (!body.success) {
    throw new ApiError(
      body.message || 'Thao tác không thành công.',
      'BUSINESS',
      response.status,
      body.errors ?? [],
    );
  }
  return body.data as T;
}
