// DTO của backend cho health profile / meta (docs/fetch-api/part1 Phụ lục A) — chỉ service và
// mapper import file này, hook/screen chỉ biết type FE trong health.types.ts.

/** Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ (POST /healthprofile/survey). */
export interface HealthSurveyRequest {
  /** Male | Female | Other (BE chỉ có công thức Nam/Nữ — mọi giá trị ≠ Male dùng công thức nữ). */
  gender: string;
  /** Ngày sinh yyyy-MM-dd (BR-001); BE tính tuổi và kiểm tra 13–100. */
  dateOfBirth: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  /** Sedentary | Light | Moderate | Active | VeryActive */
  activityLevel: string;
  /** LoseWeight | Maintain | GainWeight | GainMuscle */
  goal: string;
  /** id int của /meta/allergies. */
  allergyIds: number[];
  /** id int của /meta/medical-conditions. */
  medicalConditionIds: number[];
  /** id int của /meta/tags (Eat Clean, Keto...). */
  dietaryPreferenceIds: number[];
}

/**
 * Sửa từng phần hồ sơ đã có (PUT /healthprofile): trường không gửi giữ nguyên, danh sách `[]` là
 * xóa hết. BE tự tính lại BMI/BMR/TDEE/macro và KHÔNG thêm dòng cân nặng.
 */
export interface UpdateHealthProfileRequest {
  gender?: string;
  dateOfBirth?: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  activityLevel?: string;
  goal?: string;
  allergyIds?: number[];
  medicalConditionIds?: number[];
  dietaryPreferenceIds?: number[];
  waterGoalMl?: number;
}

export interface HealthProfileDto {
  id: string;
  gender: string;
  /** Tuổi hiện tại (tính từ ngày sinh nếu có). */
  age: number;
  /** yyyy-MM-dd; null với hồ sơ cũ tạo trước khi BE lưu ngày sinh. */
  dateOfBirth: string | null;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: string;
  goal: string;
  /** Mục tiêu nước uống mỗi ngày (ml). */
  waterGoalMl: number;
  bmi: number;
  /** Song ngữ, vd. "Bình thường (Normal)". */
  bmiClassification: string;
  bmr: number;
  tdee: number;
  dailyCaloriesTarget: number;
  dailyCarbsTargetGrams: number;
  dailyFatTargetGrams: number;
  dailyProteinTargetGrams: number;
  /** id trong /meta/allergies, /meta/medical-conditions, /meta/tags — dùng id, không dùng tên. */
  allergyIds?: number[];
  medicalConditionIds?: number[];
  dietaryPreferenceIds?: number[];
  allergies?: string[];
  medicalConditions?: string[];
}

export interface WeightLogRequest {
  weightKg: number;
  /** ISO 8601 UTC (có hậu tố Z) — không gửi chuỗi chỉ có ngày. */
  recordedAt?: string;
}

export interface WeightPointDto {
  id: string;
  weightKg: number;
  recordedAt: string;
  diffFromTargetKg: number;
}

export interface WeightHistoryResponse {
  currentWeightKg: number;
  targetWeightKg: number;
  initialWeightKg: number;
  totalWeightChangedKg: number;
  bmi: number;
  bmiCategory: string;
  /** Thứ tự cũ → mới. */
  history: WeightPointDto[];
}

/**
 * Một mục danh mục /meta/* (dị ứng, bệnh lý, chế độ ăn). `code` là mã ổn định trùng slug của FE
 * (vd. "seafood", "diabetes", "eatClean") nên FE ánh xạ theo code, không phụ thuộc id seed.
 */
export interface MetaItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}
