import type { NutritionInfo } from '@/features/nutrition';
import type { MealType } from '@/types/meal.types';

// BR-060, BR-061, BR-070 — AI Snap & Voice Logging đều trả về danh sách món ước tính, User
// phải Review/Confirm trước khi lưu (BR-054).

export interface AIUncertainCandidate {
  id: string;
  name: string;
  confidencePercent: number;
}

export interface AIPortionOption {
  id: string;
  label: string;
  grams: number;
}

// design/AISnapUncertain.dc.html (BR-072, BR-054) — AI đưa ra nhiều tên món khả dĩ, User phải
// chọn đúng món + khẩu phần trước khi món này được tính vào Confirm; dinh dưỡng/gram coi như
// không đổi giữa các candidate (AI chưa chắc về TÊN món, không phải giá trị dinh dưỡng cơ bản).
export interface AIUncertainResolution {
  candidates: AIUncertainCandidate[];
  portionOptions: AIPortionOption[];
  nutritionPerGram: NutritionInfo;
}

export interface AIRecognizedItem {
  id: string;
  name: string;
  servingLabel: string;
  grams: number;
  nutrition: NutritionInfo;
  /** "Chưa chắc chắn · kiểm tra lại" — design/AISnap.dc.html (món Canh cải). */
  isUncertain?: boolean;
  /** Chỉ có khi isUncertain=true — xem AISnapResultScreen/AiUncertainItemCard. */
  uncertainResolution?: AIUncertainResolution;
}

export interface AIAnalysisResult {
  mealType: MealType;
  items: AIRecognizedItem[];
  allergyWarnings?: string[];
  healthTips?: string;
  detectedIngredients?: string[];
  /** true khi backend trả dữ liệu MẪU (chưa cấu hình AI) — phải báo rõ để không lưu nhầm thành bữa ăn thật. */
  isDemo?: boolean;
}

export interface VoicePortionOption {
  id: string;
  label: string;
  grams: number;
}

export interface VoicePortionQuestion {
  itemId: string;
  question: string;
  description: string;
  options: VoicePortionOption[];
}

export interface VoiceLogResult {
  mealType: MealType;
  transcript: string;
  items: AIRecognizedItem[];
  portionQuestion?: VoicePortionQuestion;
  /** true khi backend trả dữ liệu MẪU (chưa cấu hình AI). */
  isDemo?: boolean;
}

/** Hạn mức AI trong ngày (BR-233): Free có số lượt cố định, Pro không giới hạn. */
export interface AiQuota {
  isUnlimited: boolean;
  /** Số lượt miễn phí mỗi ngày; null khi không giới hạn. */
  limit: number | null;
  used: number;
  /** Số lượt còn lại hôm nay; null khi không giới hạn. */
  remaining: number | null;
  /** Thời điểm làm mới hạn mức (ISO UTC). */
  resetsAtIso: string;
}
