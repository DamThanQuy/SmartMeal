// DTO của backend cho /ai/* (docs/fetch-api/part1 Phụ lục A) — chỉ service và mapper import file
// này, hook/screen chỉ biết type FE trong ai.types.ts.

/** GET /ai/quota — hạn mức AI trong ngày (BR-233). */
export interface AiQuotaDto {
  /** Pro không giới hạn. */
  isUnlimited: boolean;
  /** Số lượt miễn phí mỗi ngày; null nếu không giới hạn. */
  limit: number | null;
  used: number;
  /** Số lượt còn lại hôm nay; null nếu không giới hạn. */
  remaining: number | null;
  /** Thời điểm hạn mức được làm mới (ISO 8601 UTC). */
  resetsAt: string;
}

/** POST /ai/snap-and-track (multipart, trường `image`) — BE trả MỘT món ước tính cho cả đĩa. */
export interface SnapAndTrackResponseDto {
  dishName: string;
  estimatedGrams: number;
  /** 0–1. */
  confidenceScore: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  detectedIngredients: string[];
  /** Cảnh báo dị ứng theo hồ sơ của người dùng (BR-102). */
  allergyWarnings: string[];
  healthTips: string | null;
  /** true khi đây là dữ liệu MẪU (BE chưa cấu hình AI, chỉ ở môi trường phát triển), không phải kết quả thật. */
  isDemo: boolean;
}

/** POST /ai/voice-log — văn bản đã nhận dạng giọng nói (BE không nhận file âm thanh). */
export interface VoiceLogRequestDto {
  /** 2–1000 ký tự. */
  transcript: string;
}

export interface ExtractedMealItemDto {
  foodName: string;
  portionDescription: string;
  portionGrams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface VoiceLogResponseDto {
  mealType: string;
  extractedItems: ExtractedMealItemDto[];
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  isDemo: boolean;
}
