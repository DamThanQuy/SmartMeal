/**
 * URL backend: ưu tiên EXPO_PUBLIC_API_URL; để trống thì dùng IP của máy đang chạy Metro (Expo Go cùng
 * mạng với máy tính) + cổng API, để không phải sửa `.env` mỗi khi máy tính đổi IP.
 */
import { resolveApiBaseUrl } from '@/config/env';

describe('resolveApiBaseUrl', () => {
  test('có EXPO_PUBLIC_API_URL → dùng đúng giá trị đó', () => {
    expect(resolveApiBaseUrl(' https://api.smartmeal.vn/api ', '192.168.100.6:8081', 5000)).toBe(
      'https://api.smartmeal.vn/api',
    );
  });

  test('để trống → lấy IP của máy chạy Metro + cổng API', () => {
    expect(resolveApiBaseUrl(undefined, '192.168.100.6:8081', 5000)).toBe('http://192.168.100.6:5000/api');
    expect(resolveApiBaseUrl('', '10.0.0.25:8082', 5001)).toBe('http://10.0.0.25:5001/api');
  });

  test('tunnel (tên miền exp.direct) hoặc không chạy qua Expo → localhost', () => {
    expect(resolveApiBaseUrl(undefined, 'abc-anonymous-8081.exp.direct', 5000)).toBe('http://localhost:5000/api');
    expect(resolveApiBaseUrl(undefined, undefined, 5000)).toBe('http://localhost:5000/api');
  });
});
