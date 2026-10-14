import { isAxiosError } from 'axios';
import type { ApiEnvelope } from '@/types/api';

// Chuẩn hóa MỌI lỗi gọi API về 1 kiểu ApiError có `message` tiếng Việt thân thiện — screen/hook
// hiển thị `error.message` là đủ. Backend trả MỌI lỗi (kể cả validate, 401 của JWT, route không
// có, lỗi chưa bắt) trong cùng một envelope { success:false, message, data:null, errors } nên chỉ
// còn hai nguồn: envelope (dùng message của BE) và "không có envelope" (mất mạng, timeout, proxy
// chen vào giữa) → message theo HTTP status.

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BUSINESS'
  /** 409 — vd. trùng dữ liệu, thực đơn đang được cập nhật ở nơi khác. */
  | 'CONFLICT'
  /** 423 — tài khoản bị khóa tạm thời do đăng nhập sai nhiều lần. */
  | 'LOCKED'
  /** 429 — quá nhiều request hoặc hết hạn mức (vd. quota AI của gói Free). */
  | 'RATE_LIMITED'
  /** 502/503 — dịch vụ phía sau (vd. Gemini) lỗi hoặc chưa cấu hình. */
  | 'UNAVAILABLE'
  | 'SERVER'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status; null khi chưa có response (mất mạng, timeout). */
  readonly status: number | null;
  /** Chi tiết bổ sung (vd. danh sách lỗi validate) — không hiển thị thẳng cho người dùng. */
  readonly details: string[];

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number | null = null,
    details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    // Giữ `instanceof ApiError` đúng khi class extends Error bị biên dịch xuống mức thấp hơn.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const MESSAGES = {
  network: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
  timeout: 'Máy chủ phản hồi quá lâu, vui lòng thử lại.',
  unauthorized: 'Phiên đăng nhập đã hết hạn.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  notFound: 'Không tìm thấy dữ liệu.',
  conflict: 'Dữ liệu vừa được thay đổi ở nơi khác, vui lòng thử lại.',
  locked: 'Tài khoản tạm thời bị khóa, vui lòng thử lại sau.',
  rateLimited: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.',
  unavailable: 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.',
  server: 'Máy chủ gặp sự cố, vui lòng thử lại sau.',
  canceled: 'Yêu cầu đã bị hủy.',
  unknown: 'Đã xảy ra lỗi không xác định.',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Body có dạng ApiResponse<T> của BE (success luôn là boolean). */
export function isApiEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return isRecord(body) && typeof body.success === 'boolean';
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 423) return 'LOCKED';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 502 || status === 503) return 'UNAVAILABLE';
  if (status >= 500) return 'SERVER';
  // 400 và các 4xx còn lại — lỗi nghiệp vụ/validate do BE trả kèm message.
  return 'BUSINESS';
}

function messageForStatus(status: number): string {
  switch (codeForStatus(status)) {
    case 'UNAUTHORIZED':
      return MESSAGES.unauthorized;
    case 'FORBIDDEN':
      return MESSAGES.forbidden;
    case 'NOT_FOUND':
      return MESSAGES.notFound;
    case 'CONFLICT':
      return MESSAGES.conflict;
    case 'LOCKED':
      return MESSAGES.locked;
    case 'RATE_LIMITED':
      return MESSAGES.rateLimited;
    case 'UNAVAILABLE':
      return MESSAGES.unavailable;
    case 'SERVER':
      return MESSAGES.server;
    default:
      return MESSAGES.unknown;
  }
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (!isAxiosError(error)) return new ApiError(MESSAGES.unknown, 'UNKNOWN');

  if (error.code === 'ERR_CANCELED') return new ApiError(MESSAGES.canceled, 'UNKNOWN');

  const response = error.response;
  if (!response) {
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return isTimeout
      ? new ApiError(MESSAGES.timeout, 'TIMEOUT')
      : new ApiError(MESSAGES.network, 'NETWORK');
  }

  const { status, data } = response;

  if (isApiEnvelope(data)) {
    return new ApiError(
      data.message || messageForStatus(status),
      codeForStatus(status),
      status,
      data.errors ?? [],
    );
  }

  // Không có envelope (proxy trả HTML, cổng sai...): chỉ biết HTTP status.
  return new ApiError(messageForStatus(status), codeForStatus(status), status);
}
