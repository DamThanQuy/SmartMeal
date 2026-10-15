import { nutritionApiService } from './nutritionService.api';

// Ghi cả bữa là một request nên không có lỗi "lưu được một phần"; sửa món là PUT nên không có "món trùng".
export const nutritionService = nutritionApiService;

// Nhiều screen import tiện ích này từ đúng đường dẫn của service (và index.ts export * từ đây).
export { todayIso } from '@/utils/date';
