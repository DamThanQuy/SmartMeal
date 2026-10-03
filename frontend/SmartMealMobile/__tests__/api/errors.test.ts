/**
 * ApiError/toApiError/unwrap (docs/fetch-api/part1 §3.2–§3.3, §4.4): BE trả MỌI lỗi trong một
 * envelope; chỉ khi không có envelope (mất mạng, proxy) mới dựa vào HTTP status.
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ApiError, isApiError, toApiError } from '@/services/api/errors';
import { unwrap } from '@/services/api/unwrap';
import type { ApiEnvelope } from '@/types/api';

const config = { headers: {} } as InternalAxiosRequestConfig;

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('toApiError', () => {
  test('giữ nguyên ApiError đã chuẩn hóa', () => {
    const original = new ApiError('x', 'BUSINESS', 400);
    expect(toApiError(original)).toBe(original);
  });

  test('lỗi không phải Axios → UNKNOWN với message tiếng Việt', () => {
    const error = toApiError(new TypeError('boom'));
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe('Đã xảy ra lỗi không xác định.');
  });

  test('không có response + ECONNABORTED → TIMEOUT', () => {
    const error = toApiError(new AxiosError('timeout', 'ECONNABORTED', config));
    expect(error.code).toBe('TIMEOUT');
    expect(error.status).toBeNull();
  });

  test('không có response + lỗi khác → NETWORK', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK', config));
    expect(error.code).toBe('NETWORK');
    expect(error.message).toContain('Không kết nối được máy chủ');
  });

  test('envelope: dùng message của BE (vd. sai mật khẩu 401 vẫn có message)', () => {
    const error = toApiError(
      axiosErrorWithResponse(401, {
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
        data: null,
        errors: null,
      }),
    );
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
    expect(error.message).toBe('Email hoặc mật khẩu không chính xác.');
  });

  test('envelope 400 → BUSINESS, giữ errors[] làm details', () => {
    const error = toApiError(
      axiosErrorWithResponse(400, {
        success: false,
        message: 'Email đã được sử dụng.',
        data: null,
        errors: ['email'],
      }),
    );
    expect(error.code).toBe('BUSINESS');
    expect(error.details).toEqual(['email']);
  });

  test('envelope 404 → NOT_FOUND', () => {
    const error = toApiError(
      axiosErrorWithResponse(404, {
        success: false,
        message: 'Chưa hoàn thành khảo sát sức khỏe ban đầu.',
        data: null,
        errors: null,
      }),
    );
    expect(error.code).toBe('NOT_FOUND');
  });

  test('envelope 400 do validate: message là lỗi đầu tiên, errors[] giữ đủ danh sách', () => {
    const error = toApiError(
      axiosErrorWithResponse(400, {
        success: false,
        message: 'Email không đúng định dạng.',
        data: null,
        errors: ['Email không đúng định dạng.', 'Mật khẩu phải từ 8 đến 128 ký tự.'],
      }),
    );
    expect(error.code).toBe('BUSINESS');
    expect(error.message).toBe('Email không đúng định dạng.');
    expect(error.details).toHaveLength(2);
  });

  test.each([
    [409, 'CONFLICT'],
    [423, 'LOCKED'],
    [429, 'RATE_LIMITED'],
    [502, 'UNAVAILABLE'],
    [503, 'UNAVAILABLE'],
  ])('envelope %i → %s, dùng message của BE', (status, code) => {
    const error = toApiError(
      axiosErrorWithResponse(status, { success: false, message: 'Thông báo từ BE.', data: null, errors: null }),
    );
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
    expect(error.message).toBe('Thông báo từ BE.');
  });

  test.each([
    [401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.'],
    [403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
    [404, 'NOT_FOUND', 'Không tìm thấy dữ liệu.'],
    [409, 'CONFLICT', 'Dữ liệu vừa được thay đổi ở nơi khác, vui lòng thử lại.'],
    [423, 'LOCKED', 'Tài khoản tạm thời bị khóa, vui lòng thử lại sau.'],
    [429, 'RATE_LIMITED', 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'],
    [500, 'SERVER', 'Máy chủ gặp sự cố, vui lòng thử lại sau.'],
    [503, 'UNAVAILABLE', 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.'],
  ])('không có envelope, status %i → %s', (status, code, message) => {
    const error = toApiError(axiosErrorWithResponse(status, ''));
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
  });

  test('isApiError nhận diện đúng', () => {
    expect(isApiError(new ApiError('x', 'UNKNOWN'))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
  });
});

describe('unwrap', () => {
  function response<T>(body: unknown, status = 200): AxiosResponse<ApiEnvelope<T>> {
    return { status, data: body, statusText: '', headers: {}, config } as AxiosResponse<
      ApiEnvelope<T>
    >;
  }

  test('success:true → trả data', () => {
    const result = unwrap<{ id: string }>(
      response({ success: true, message: 'ok', data: { id: '1' }, errors: null }),
    );
    expect(result).toEqual({ id: '1' });
  });

  test('success:false dù HTTP 200 → ApiError BUSINESS với message của BE', () => {
    expect(() =>
      unwrap(
        response({
          success: false,
          message: 'Vui lòng cung cấp ít nhất 1 nguyên liệu.',
          data: null,
          errors: null,
        }),
      ),
    ).toThrow(ApiError);

    try {
      unwrap(
        response({
          success: false,
          message: 'Vui lòng cung cấp ít nhất 1 nguyên liệu.',
          data: null,
          errors: ['x'],
        }),
      );
    } catch (error) {
      expect(isApiError(error)).toBe(true);
      expect((error as ApiError).code).toBe('BUSINESS');
      expect((error as ApiError).message).toBe('Vui lòng cung cấp ít nhất 1 nguyên liệu.');
      expect((error as ApiError).details).toEqual(['x']);
    }
  });

  test('body không phải envelope (null/chuỗi) → ApiError UNKNOWN', () => {
    expect(() => unwrap(response(null))).toThrow('Phản hồi từ máy chủ không hợp lệ.');
    expect(() => unwrap(response('<html/>'))).toThrow(ApiError);
  });
});
