import { isAxiosError } from 'axios';
import type { ApiEnvelope, ApiProblemDetails } from '@/types/api';

// Chuẩn hóa MỌI lỗi gọi API về 1 kiểu ApiError có `message` tiếng Việt thân thiện — screen/hook
// hiện đã hiển thị `error.message` nên giữ được nguyên UI (docs/fetch-api/part1 §4.4). BE trả lỗi
// ở 3 dạng body khác nhau (envelope, ProblemDetails, rỗng — §3.3), toApiError xử lý cả ba.

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'BUSINESS'
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
  validation: 'Dữ liệu gửi lên không hợp lệ.',
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

function isProblemDetails(body: unknown): body is ApiProblemDetails {
  return isRecord(body) && (typeof body.title === 'string' || isRecord(body.errors));
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status >= 500) return 'SERVER';
  // 400/409/... — lỗi nghiệp vụ do BE trả kèm message.
  return 'BUSINESS';
}

function messageForStatus(status: number): string {
  if (status === 401) return MESSAGES.unauthorized;
  if (status === 403) return MESSAGES.forbidden;
  if (status === 404) return MESSAGES.notFound;
  if (status >= 500) return MESSAGES.server;
  return MESSAGES.unknown;
}

function flattenProblemErrors(errors: ApiProblemDetails['errors']): string[] {
  if (!errors) return [];
  return Object.values(errors).flatMap(messages => (Array.isArray(messages) ? messages : []));
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

  if (isProblemDetails(data)) {
    const details = flattenProblemErrors(data.errors);
    const code = status === 400 ? 'VALIDATION' : codeForStatus(status);
    // `title` của ProblemDetails là tiếng Anh kỹ thuật — không hiển thị cho người dùng.
    const message = status === 400 ? MESSAGES.validation : messageForStatus(status);
    return new ApiError(message, code, status, details);
  }

  // Body rỗng: 401 (JWT middleware), 404 (route/ràng buộc :guid), 415, 500 chưa bắt...
  return new ApiError(messageForStatus(status), codeForStatus(status), status);
}
