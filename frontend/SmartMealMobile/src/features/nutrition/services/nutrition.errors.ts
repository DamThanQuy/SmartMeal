import type { MealLogEntry, NewMealLogInput } from '../types/nutrition.types';

/**
 * Lưu N món vào nhật ký nhưng chỉ một phần thành công (BR-054 AI Confirm → Save). Món đã lưu KHÔNG
 * được gửi lại — nơi bắt lỗi chỉ thử lại `failed` (gửi lại cả danh sách sẽ tạo món trùng). Hook
 * vẫn làm mới nhật ký để món đã lưu hiện ra.
 */
export class PartialLogError extends Error {
  readonly saved: MealLogEntry[];
  readonly failed: NewMealLogInput[];

  constructor(saved: MealLogEntry[], failed: NewMealLogInput[]) {
    super(
      `Đã lưu ${saved.length}/${saved.length + failed.length} món. ${failed.length} món chưa lưu được, vui lòng thử lại.`,
    );
    this.name = 'PartialLogError';
    this.saved = saved;
    this.failed = failed;
    // Giữ `instanceof` đúng khi class extends Error bị biên dịch xuống mức thấp hơn.
    Object.setPrototypeOf(this, PartialLogError.prototype);
  }
}

/**
 * Sửa món (tạm: ghi bản mới rồi xóa bản cũ vì BE chưa có PUT — P1-BE-05) đã ghi được bản mới
 * nhưng chưa xóa được bản cũ → nhật ký có thể đang chứa món trùng; người dùng cần xóa bản cũ.
 */
export class UpdateIncompleteError extends Error {
  readonly savedEntry: MealLogEntry;

  constructor(savedEntry: MealLogEntry) {
    super(
      'Đã lưu bản mới nhưng chưa xóa được bản cũ — món có thể bị trùng trong nhật ký. Hãy xóa bản cũ thủ công.',
    );
    this.name = 'UpdateIncompleteError';
    this.savedEntry = savedEntry;
    Object.setPrototypeOf(this, UpdateIncompleteError.prototype);
  }
}
