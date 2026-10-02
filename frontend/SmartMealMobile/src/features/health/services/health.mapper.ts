import type { HealthProfileDto, HealthSurveyRequest } from '../types/health.api.types';
import type {
  ActivityLevel,
  Gender,
  HealthGoal,
  HealthProfileExtras,
  HealthProfileFormData,
  HealthProfileInput,
  HealthProfileResult,
  HealthProfileSnapshot,
  HealthSelection,
} from '../types/health.types';
import {
  ALLERGY_META_ID_BY_SLUG,
  CONDITION_META_ID_BY_SLUG,
  allergySlugFromName,
  conditionSlugFromName,
  hasAllergyMetaId,
  hasConditionMetaId,
  toMetaIds,
} from '../utils/metaMapping';
import { calculateAge } from './healthCalculator';

// Hàm thuần quy đổi DTO backend ↔ type FE cho health profile (docs/fetch-api/part1 §6.2–§6.3).
// Không gọi API, không đọc store — để test bằng fixture JSON.

const GENDER_TO_API: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const ACTIVITY_LEVEL_TO_API: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  veryActive: 'VeryActive',
};

// D3 (docs/fetch-api/part1 §0.4): FE chỉ có 1 lựa chọn "Tăng cân" → gửi GainWeight (+400 kcal);
// số liệu hiển thị lấy từ BE (BR-022) nên không lệch với healthCalculator.ts phía FE (+300).
const GOAL_TO_API: Record<HealthGoal, string> = {
  lose: 'LoseWeight',
  maintain: 'Maintain',
  gain: 'GainWeight',
};

export function genderFromApi(value: string): Gender {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male') return 'male';
  if (normalized === 'female') return 'female';
  return 'other';
}

export function activityLevelFromApi(value: string): ActivityLevel {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'light') return 'light';
  if (normalized === 'moderate') return 'moderate';
  if (normalized === 'active') return 'active';
  if (normalized === 'veryactive') return 'veryActive';
  return 'sedentary';
}

export function goalFromApi(value: string): HealthGoal {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'loseweight') return 'lose';
  if (normalized === 'gainweight' || normalized === 'gainmuscle') return 'gain';
  return 'maintain';
}

/** Dị ứng/bệnh lý/chế độ ăn đã chọn ở wizard — "Không có" (noXxx) thắng danh sách đã tick. */
export function selectionFromForm(formData: HealthProfileFormData): HealthSelection {
  return {
    allergyIds: formData.noAllergies ? [] : formData.allergyIds,
    healthConditionIds: formData.noHealthConditions ? [] : formData.healthConditionIds,
    dietaryPreferenceIds: formData.noDietaryPreference ? [] : formData.dietaryPreferenceIds,
  };
}

/** 7 bước wizard → hồ sơ. Giá trị chưa chọn dùng cùng mặc định với bản mock cũ. */
export function profileInputFromForm(formData: HealthProfileFormData): HealthProfileInput {
  const { day, month, year } = formData.dateOfBirth;
  const weightKg = Number(formData.weightKg);
  const selection = selectionFromForm(formData);

  return {
    gender: formData.gender ?? 'other',
    dateOfBirth: new Date(Number(year), Number(month) - 1, Number(day)),
    heightCm: Number(formData.heightCm),
    weightKg,
    goalWeightKg: Number(formData.goalWeightKg) || weightKg,
    activityLevel: formData.activityLevel ?? 'sedentary',
    goal: formData.goal ?? 'maintain',
    allergyIds: selection.allergyIds,
    healthConditionIds: selection.healthConditionIds,
  };
}

/** Phần lựa chọn mà BE không lưu: chế độ ăn + dị ứng/bệnh lý không có id trên BE. */
export function extrasFromSelection(selection: HealthSelection): HealthProfileExtras {
  return {
    dietaryPreferenceIds: selection.dietaryPreferenceIds,
    localAllergyIds: selection.allergyIds.filter(slug => !hasAllergyMetaId(slug)),
    localHealthConditionIds: selection.healthConditionIds.filter(slug => !hasConditionMetaId(slug)),
  };
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

/** Ghép lại lựa chọn đầy đủ từ hồ sơ BE (chỉ có mục có id) + phần giữ cục bộ. */
export function selectionFromServer(
  snapshot: Pick<HealthProfileSnapshot, 'allergyIds' | 'healthConditionIds'>,
  extras: HealthProfileExtras,
): HealthSelection {
  return {
    allergyIds: unique([...snapshot.allergyIds, ...extras.localAllergyIds]),
    healthConditionIds: unique([...snapshot.healthConditionIds, ...extras.localHealthConditionIds]),
    dietaryPreferenceIds: extras.dietaryPreferenceIds,
  };
}

export function toSurveyRequest(
  input: HealthProfileInput,
  today: Date = new Date(),
): HealthSurveyRequest {
  return {
    gender: GENDER_TO_API[input.gender],
    // BE chỉ lưu tuổi (không lưu ngày sinh).
    age: calculateAge(input.dateOfBirth, today),
    heightCm: input.heightCm,
    currentWeightKg: input.weightKg,
    targetWeightKg: input.goalWeightKg,
    activityLevel: ACTIVITY_LEVEL_TO_API[input.activityLevel],
    goal: GOAL_TO_API[input.goal],
    allergyIds: toMetaIds(input.allergyIds, ALLERGY_META_ID_BY_SLUG),
    medicalConditionIds: toMetaIds(input.healthConditionIds, CONDITION_META_ID_BY_SLUG),
  };
}

export function toHealthProfileResult(dto: HealthProfileDto): HealthProfileResult {
  return {
    bmi: dto.bmi,
    // BE trả BMR/TDEE/mục tiêu dạng số thực chưa làm tròn.
    bmr: Math.round(dto.bmr),
    tdee: Math.round(dto.tdee),
    calorieTarget: Math.round(dto.dailyCaloriesTarget),
    macros: {
      proteinG: Math.round(dto.dailyProteinTargetGrams),
      carbsG: Math.round(dto.dailyCarbsTargetGrams),
      fatG: Math.round(dto.dailyFatTargetGrams),
    },
    goal: goalFromApi(dto.goal),
  };
}

function slugsFromNames(
  names: readonly string[],
  resolve: (name: string) => string | undefined,
): string[] {
  const slugs = names.map(resolve).filter((slug): slug is string => slug !== undefined);
  return unique(slugs);
}

export function fromHealthProfileDto(dto: HealthProfileDto): HealthProfileSnapshot {
  return {
    gender: genderFromApi(dto.gender),
    age: dto.age,
    heightCm: dto.heightCm,
    weightKg: dto.currentWeightKg,
    goalWeightKg: dto.targetWeightKg,
    activityLevel: activityLevelFromApi(dto.activityLevel),
    goal: goalFromApi(dto.goal),
    // `allergies`/`medicalConditions` là TÊN (không phải id); tên không nhận ra (vd. "Mỡ máu cao",
    // chưa có ở FE) bị bỏ — không ảnh hưởng dữ liệu đã lưu trên BE.
    allergyIds: slugsFromNames(dto.allergies, allergySlugFromName),
    healthConditionIds: slugsFromNames(dto.medicalConditions, conditionSlugFromName),
    result: toHealthProfileResult(dto),
  };
}

/** BE chỉ có tuổi → ước lượng ngày sinh = 01/01 của (năm nay − tuổi). EditProfile hiển thị "≈". */
export function approximateDateOfBirth(age: number, today: Date = new Date()): Date {
  return new Date(today.getFullYear() - age, 0, 1);
}

/** Giữ ngày sinh đang có nếu vẫn khớp tuổi BE (vừa nhập trên máy này), không thì ước lượng. */
export function resolveDateOfBirth(current: Date, age: number, today: Date = new Date()): Date {
  return calculateAge(current, today) === age ? current : approximateDateOfBirth(age, today);
}
