// DTO của backend cho health profile / meta (docs/fetch-api/part1 Phụ lục A) — chỉ service và
// mapper import file này, hook/screen chỉ biết type FE trong health.types.ts.

export interface HealthSurveyRequest {
  /** Male | Female | Other (BE chỉ có công thức Nam/Nữ — mọi giá trị ≠ Male dùng công thức nữ). */
  gender: string;
  /** BE chỉ lưu tuổi, không lưu ngày sinh. */
  age: number;
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
}

export interface HealthProfileDto {
  id: string;
  gender: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: string;
  goal: string;
  bmi: number;
  /** Song ngữ, vd. "Bình thường (Normal)". */
  bmiClassification: string;
  bmr: number;
  tdee: number;
  dailyCaloriesTarget: number;
  dailyCarbsTargetGrams: number;
  dailyFatTargetGrams: number;
  dailyProteinTargetGrams: number;
  /** TÊN dị ứng (vd. "Hải sản (Seafood)"), không phải id. */
  allergies: string[];
  /** TÊN bệnh lý (vd. "Tiểu đường (Diabetes)"), không phải id. */
  medicalConditions: string[];
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
 * /meta/* trả thẳng entity EF; có thể kèm mảng rỗng userAllergies/userConditions/recipeTags — bỏ
 * qua. Tag không có description.
 */
export interface MetaItem {
  id: number;
  name: string;
  description?: string | null;
}
