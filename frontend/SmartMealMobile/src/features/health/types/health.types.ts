// BR-001 — Hồ sơ người dùng: ngày sinh, giới tính, chiều cao, cân nặng, mục tiêu cân nặng,
// mức độ vận động, chế độ ăn, dị ứng, bệnh lý, mục tiêu dinh dưỡng.

export type Gender = 'male' | 'female' | 'other';

export type HealthGoal = 'lose' | 'maintain' | 'gain';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'veryActive';

export interface HealthProfileFormData {
  dateOfBirth: { day: string; month: string; year: string };
  gender: Gender | null;
  heightCm: string;
  weightKg: string;
  goal: HealthGoal | null;
  goalWeightKg: string;
  activityLevel: ActivityLevel | null;
  allergyIds: string[];
  otherAllergyText: string;
  noAllergies: boolean;
  healthConditionIds: string[];
  noHealthConditions: boolean;
  dietaryPreferenceIds: string[];
  noDietaryPreference: boolean;
}

export const createEmptyHealthProfileFormData = (): HealthProfileFormData => ({
  dateOfBirth: { day: '', month: '', year: '' },
  gender: null,
  heightCm: '',
  weightKg: '',
  goal: null,
  goalWeightKg: '',
  activityLevel: null,
  allergyIds: [],
  otherAllergyText: '',
  noAllergies: false,
  healthConditionIds: [],
  noHealthConditions: false,
  dietaryPreferenceIds: [],
  noDietaryPreference: false,
});

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface HealthProfileResult {
  bmi: number;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  macros: MacroTargets;
  goal: HealthGoal;
}

export interface GenderOption {
  id: Gender;
  label: string;
}

export const GENDER_OPTIONS: GenderOption[] = [
  { id: 'male', label: 'Nam' },
  { id: 'female', label: 'Nữ' },
  { id: 'other', label: 'Khác' },
];

export interface GoalOption {
  id: HealthGoal;
  title: string;
  description: string;
}

// design/HealthProfile.dc.html (bước 3/7).
export const GOAL_OPTIONS: GoalOption[] = [
  { id: 'lose', title: 'Giảm cân', description: 'Calo mục tiêu thấp hơn TDEE' },
  { id: 'maintain', title: 'Giữ cân', description: 'Calo mục tiêu xấp xỉ TDEE' },
  { id: 'gain', title: 'Tăng cân', description: 'Calo mục tiêu cao hơn TDEE' },
];

export interface ActivityOption {
  id: ActivityLevel;
  title: string;
  description: string;
}

// design/HPActivity.dc.html (bước 4/7).
export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { id: 'sedentary', title: 'Ít vận động', description: 'Làm văn phòng, hầu như không tập' },
  { id: 'light', title: 'Nhẹ', description: 'Tập 1–3 buổi/tuần' },
  { id: 'moderate', title: 'Vừa phải', description: 'Tập 3–5 buổi/tuần' },
  { id: 'active', title: 'Nhiều', description: 'Tập 6–7 buổi/tuần' },
  { id: 'veryActive', title: 'Rất nhiều', description: 'Lao động nặng hoặc tập 2 lần/ngày' },
];

export interface ChipOption {
  id: string;
  label: string;
}

// design/HPAllergy.dc.html (bước 5/7).
export const ALLERGY_OPTIONS: ChipOption[] = [
  { id: 'seafood', label: 'Hải sản' },
  { id: 'peanut', label: 'Đậu phộng' },
  { id: 'dairy', label: 'Sữa' },
  { id: 'egg', label: 'Trứng' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'soy', label: 'Đậu nành' },
  { id: 'treeNut', label: 'Các loại hạt' },
  { id: 'sesame', label: 'Mè' },
  { id: 'other', label: 'Khác' },
];

// Bước 6/7 — Sức khỏe (BR-110, BR-111 chỉ nêu 3 bệnh lý này).
export const HEALTH_CONDITION_OPTIONS: ChipOption[] = [
  { id: 'diabetes', label: 'Tiểu đường' },
  { id: 'gout', label: 'Gút' },
  { id: 'hypertension', label: 'Cao huyết áp' },
  { id: 'other', label: 'Khác' },
];

// Bước 7/7 — Chế độ ăn (BR-100).
export const DIETARY_PREFERENCE_OPTIONS: ChipOption[] = [
  { id: 'eatClean', label: 'Eat Clean' },
  { id: 'keto', label: 'Keto' },
  { id: 'lowCarb', label: 'Low-Carb' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
];

/** Hồ sơ phía FE ở dạng đủ để gửi lên backend (khớp state của userProfileStore). */
export interface HealthProfileInput {
  gender: Gender;
  dateOfBirth: Date;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  allergyIds: string[];
  healthConditionIds: string[];
}

export interface WeightHistoryEntry {
  id: string;
  /** ISO date yyyy-MM-dd (giờ máy). */
  dateIso: string;
  weightKg: number;
}

/** Ghi cân nặng mới (BR-003 — tính lại BMI→BMR→TDEE→Calorie→Macro). */
export interface WeightRecordInput {
  weightKg: number;
  /** ISO date yyyy-MM-dd (giờ máy) của lần cân. */
  dateIso: string;
}

/** EditProfileScreen — đổi giới tính/ngày sinh/chiều cao (BR-003: tính lại BMI→BMR→TDEE→Macro). */
export interface BasicInfoUpdate {
  gender: Gender;
  dateOfBirth: Date;
  heightCm: number;
}

/** Hồ sơ sức khỏe do backend trả về, đã quy đổi sang type FE (health.mapper.ts). */
export interface HealthProfileSnapshot {
  gender: Gender;
  /** BE chỉ lưu tuổi, không lưu ngày sinh (BR-001 cần ngày sinh — P1-BE-04). */
  age: number;
  /** Chỉ có khi nguồn dữ liệu biết ngày sinh thật (người dùng vừa nhập trên máy này, hoặc bản mock);
   * hồ sơ tải từ BE không có — store sẽ ước lượng từ `age`. */
  dateOfBirth?: Date;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  /** Slug dị ứng CÓ id trên BE (không gồm treeNut/sesame/other). */
  allergyIds: string[];
  /** Slug bệnh lý CÓ id trên BE (không gồm 'other'). */
  healthConditionIds: string[];
  result: HealthProfileResult;
}

/** Dị ứng/bệnh lý/chế độ ăn người dùng chọn (slug) — HealthSettingsScreen, bước 5–7 của wizard. */
export interface HealthSelection {
  allergyIds: string[];
  healthConditionIds: string[];
  dietaryPreferenceIds: string[];
}

/**
 * Phần hồ sơ backend KHÔNG lưu — giữ cục bộ theo từng user (AsyncStorage) để không mất sau khi tắt
 * app (docs/fetch-api/part1 §6.5, §13).
 */
export interface HealthProfileExtras {
  dietaryPreferenceIds: string[];
  /** Dị ứng không có id trên BE (treeNut, sesame, other...). */
  localAllergyIds: string[];
  /** Bệnh lý không có id trên BE ('other'...). */
  localHealthConditionIds: string[];
}

/** Hồ sơ nạp lúc đăng nhập/khởi động app để đổ vào userProfileStore. */
export interface HydratedHealthProfile {
  snapshot: HealthProfileSnapshot;
  extras: HealthProfileExtras;
}
