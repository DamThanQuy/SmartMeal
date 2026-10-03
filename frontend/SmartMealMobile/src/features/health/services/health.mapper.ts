import { formatDateIso, parseApiDateTime, parseDateIso } from '@/utils/date';
import type {
  HealthProfileDto,
  HealthSurveyRequest,
  UpdateHealthProfileRequest,
  WeightHistoryResponse,
} from '../types/health.api.types';
import type {
  ActivityLevel,
  BasicInfoUpdate,
  Gender,
  HealthGoal,
  HealthProfileExtras,
  HealthProfileFormData,
  HealthProfileInput,
  HealthProfileResult,
  HealthProfileSnapshot,
  HealthSelection,
  WeightHistoryEntry,
} from '../types/health.types';
import { calculateAge } from './healthCalculator';
import { toMetaCodes, toMetaIds, type MetaCatalog } from './metaLookup';

// Hàm thuần quy đổi DTO backend ↔ type FE cho health profile (docs/fetch-api/part1 §6.2–§6.3).
// Không gọi API, không đọc store — để test bằng fixture JSON. Ánh xạ dị ứng/bệnh lý/chế độ ăn dùng
// MetaCatalog (slug FE ↔ id BE theo `code` của /meta/*), không có bảng id cứng.

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
    dietaryPreferenceIds: selection.dietaryPreferenceIds,
  };
}

/** Phần lựa chọn mà BE không có mục tương ứng (vd. "Khác") — giữ cục bộ. */
export function extrasFromSelection(
  selection: HealthSelection,
  catalog: MetaCatalog,
): HealthProfileExtras {
  return {
    localAllergyIds: selection.allergyIds.filter(slug => !catalog.allergies.hasCode(slug)),
    localHealthConditionIds: selection.healthConditionIds.filter(
      slug => !catalog.conditions.hasCode(slug),
    ),
  };
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

/** Ghép lại lựa chọn đầy đủ từ hồ sơ BE + phần "Khác" giữ cục bộ. */
export function selectionFromServer(
  snapshot: Pick<
    HealthProfileSnapshot,
    'allergyIds' | 'healthConditionIds' | 'dietaryPreferenceIds'
  >,
  extras: HealthProfileExtras,
): HealthSelection {
  return {
    allergyIds: unique([...snapshot.allergyIds, ...extras.localAllergyIds]),
    healthConditionIds: unique([...snapshot.healthConditionIds, ...extras.localHealthConditionIds]),
    dietaryPreferenceIds: snapshot.dietaryPreferenceIds,
  };
}

/** Hồ sơ đầy đủ → khảo sát (POST /healthprofile/survey). Gửi NGÀY SINH thật, BE tự tính tuổi. */
export function toSurveyRequest(input: HealthProfileInput, catalog: MetaCatalog): HealthSurveyRequest {
  return {
    gender: GENDER_TO_API[input.gender],
    dateOfBirth: formatDateIso(input.dateOfBirth),
    heightCm: input.heightCm,
    currentWeightKg: input.weightKg,
    targetWeightKg: input.goalWeightKg,
    activityLevel: ACTIVITY_LEVEL_TO_API[input.activityLevel],
    goal: GOAL_TO_API[input.goal],
    allergyIds: toMetaIds(input.allergyIds, catalog.allergies),
    medicalConditionIds: toMetaIds(input.healthConditionIds, catalog.conditions),
    dietaryPreferenceIds: toMetaIds(input.dietaryPreferenceIds, catalog.tags),
  };
}

/** Đổi giới tính/ngày sinh/chiều cao → PUT /healthprofile (chỉ trường đổi). */
export function toBasicInfoUpdateRequest(update: BasicInfoUpdate): UpdateHealthProfileRequest {
  return {
    gender: GENDER_TO_API[update.gender],
    dateOfBirth: formatDateIso(update.dateOfBirth),
    heightCm: update.heightCm,
  };
}

/**
 * Đổi dị ứng/bệnh lý/chế độ ăn → PUT /healthprofile. Danh sách rỗng là "xóa hết" nên luôn gửi cả
 * ba (mục "Không có" phải xóa được dữ liệu cũ).
 */
export function toSelectionUpdateRequest(
  selection: HealthSelection,
  catalog: MetaCatalog,
): UpdateHealthProfileRequest {
  return {
    allergyIds: toMetaIds(selection.allergyIds, catalog.allergies),
    medicalConditionIds: toMetaIds(selection.healthConditionIds, catalog.conditions),
    dietaryPreferenceIds: toMetaIds(selection.dietaryPreferenceIds, catalog.tags),
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

export function fromHealthProfileDto(dto: HealthProfileDto, catalog: MetaCatalog): HealthProfileSnapshot {
  return {
    gender: genderFromApi(dto.gender),
    age: dto.age,
    dateOfBirth: dto.dateOfBirth ? parseDateIso(dto.dateOfBirth) : undefined,
    heightCm: dto.heightCm,
    weightKg: dto.currentWeightKg,
    goalWeightKg: dto.targetWeightKg,
    activityLevel: activityLevelFromApi(dto.activityLevel),
    goal: goalFromApi(dto.goal),
    // Id lạ (mục BE thêm sau mà FE chưa biết) bị bỏ — không ảnh hưởng dữ liệu đã lưu trên BE.
    allergyIds: toMetaCodes(dto.allergyIds, catalog.allergies),
    healthConditionIds: toMetaCodes(dto.medicalConditionIds, catalog.conditions),
    dietaryPreferenceIds: toMetaCodes(dto.dietaryPreferenceIds, catalog.tags),
    waterGoalMl: dto.waterGoalMl,
    result: toHealthProfileResult(dto),
  };
}

/** Hồ sơ cũ chưa có ngày sinh → ước lượng = 01/01 của (năm nay − tuổi). */
export function approximateDateOfBirth(age: number, today: Date = new Date()): Date {
  return new Date(today.getFullYear() - age, 0, 1);
}

/** Giữ ngày sinh đang có nếu vẫn khớp tuổi BE, không thì ước lượng (chỉ khi BE chưa có ngày sinh). */
export function resolveDateOfBirth(current: Date, age: number, today: Date = new Date()): Date {
  return calculateAge(current, today) === age ? current : approximateDateOfBirth(age, today);
}

/**
 * Snapshot dựng từ hồ sơ phía FE + kết quả tính sẵn — dùng cho bản mock (không có server trả về).
 * Biết ngày sinh thật nên gắn luôn `dateOfBirth`.
 */
export function snapshotFromInput(
  input: HealthProfileInput,
  result: HealthProfileResult,
  today: Date = new Date(),
): HealthProfileSnapshot {
  return {
    gender: input.gender,
    age: calculateAge(input.dateOfBirth, today),
    dateOfBirth: input.dateOfBirth,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    goalWeightKg: input.goalWeightKg,
    activityLevel: input.activityLevel,
    goal: input.goal,
    allergyIds: input.allergyIds,
    healthConditionIds: input.healthConditionIds,
    dietaryPreferenceIds: input.dietaryPreferenceIds,
    result,
  };
}

/** Lịch sử cân nặng: mới → cũ (BE trả cũ → mới); ngày theo giờ máy chứ không theo UTC. */
export function fromWeightHistoryDto(dto: WeightHistoryResponse): WeightHistoryEntry[] {
  return dto.history
    .map(point => ({ point, recordedAt: parseApiDateTime(point.recordedAt) }))
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .map(({ point, recordedAt }) => ({
      id: point.id,
      dateIso: formatDateIso(recordedAt),
      weightKg: point.weightKg,
    }));
}

/**
 * `recordedAt` gửi lên BE phải là ISO UTC có hậu tố Z (không gửi chuỗi chỉ có ngày). Hôm nay → thời
 * điểm hiện tại; ngày khác → 12:00 giờ máy của ngày đó.
 */
export function toRecordedAtIso(dateIso: string, now: Date = new Date()): string {
  if (dateIso === formatDateIso(now)) return now.toISOString();
  const noon = parseDateIso(dateIso);
  noon.setHours(12, 0, 0, 0);
  return noon.toISOString();
}
