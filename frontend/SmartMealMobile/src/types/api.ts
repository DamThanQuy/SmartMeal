// Kiểu dữ liệu chung cho mọi cuộc gọi API (docs/structure_system.md mục 15). DTO riêng từng
// feature đặt ở features/<feature>/types/<feature>.api.types.ts.

/** Envelope backend bọc mọi response do controller trả (ApiResponse<T> phía BE). */
export interface ApiEnvelope<T> {
  success: boolean;
  /** Câu tiếng Việt, hiển thị được thẳng lên UI. */
  message: string;
  data: T | null;
  errors: string[] | null;
}

/** Kết quả phân trang — hiện chỉ `GET /foods` phân trang (docs/fetch-api/part1 §3.7). */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * ASP.NET `ValidationProblemDetails` — lỗi binding/validate (vd. `?date=abc`, JSON hỏng) KHÔNG
 * bọc trong ApiEnvelope.
 */
export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
  traceId?: string;
}
