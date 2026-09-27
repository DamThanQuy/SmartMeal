import type { NutritionInfo } from '@/features/nutrition';
import type { MealType } from '@/types/meal.types';

// BR-060, BR-061, BR-070 — AI Snap & Voice Logging đều trả về danh sách món ước tính, User
// phải Review/Confirm trước khi lưu (BR-054).

export interface AIRecognizedItem {
  id: string;
  name: string;
  servingLabel: string;
  grams: number;
  nutrition: NutritionInfo;
  /** "Chưa chắc chắn · kiểm tra lại" — design/AISnap.dc.html (món Canh cải). */
  isUncertain?: boolean;
}

export interface AIAnalysisResult {
  mealType: MealType;
  items: AIRecognizedItem[];
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
}
