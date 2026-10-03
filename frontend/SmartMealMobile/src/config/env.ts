/**
 * Cấu hình môi trường — nguồn duy nhất cho base URL/timeout, không hard-code rải rác
 * (docs/structure_system.md mục 7). Nhánh feat/mock-ui chưa gọi API thật nên các giá trị
 * dưới đây chưa được services/api tiêu thụ, nhưng khai báo sẵn để khi nối API thật chỉ cần
 * sửa đúng 1 chỗ này.
 */
export type AppEnv = 'development' | 'staging' | 'production';

export const ENV: {
  appEnv: AppEnv;
  useMockApi: boolean;
  apiBaseUrl: string;
  apiTimeoutMs: number;
} = {
  appEnv: 'development',
  useMockApi: false,
  apiBaseUrl: 'http://localhost:5000/api',
  apiTimeoutMs: 15000,
};
