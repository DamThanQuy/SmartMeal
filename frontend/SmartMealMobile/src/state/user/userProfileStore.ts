import { create } from 'zustand';
// Import thẳng module thuần (không qua barrel '@/features/health') để store không kéo theo các
// screen của feature health — screen lại import store này (vòng phụ thuộc).
import { resolveDateOfBirth, selectionFromServer } from '@/features/health/services/health.mapper';
import type {
  ActivityLevel,
  Gender,
  HealthGoal,
  HealthProfileExtras,
  HealthProfileFormData,
  HealthProfileResult,
  HealthProfileSnapshot,
} from '@/features/health/types/health.types';
import { registerUserDataReset } from '@/state/resetUserData';

// Global client state — hồ sơ sức khỏe của user đã đăng nhập (dị ứng/bệnh lý/chế độ ăn/cân
// nặng), dùng chung cho nhiều feature (nutrition, recipes, scanner, meal-planner, profile) nên
// đặt ở src/state theo .claude/rules/architecture.md ("chỉ đưa vào global store khi nhiều
// feature thực sự cần").
//
// Store là bản sao ĐỒNG BỘ của hồ sơ trên server (docs/fetch-api/part1 §6.5): nhiều service đọc dị
// ứng/chế độ ăn đồng bộ nên không thể chờ query. Bắt đầu rỗng, được nạp bằng hydrateFromServer() lúc
// đăng nhập/khởi động app và sau mỗi lần sửa hồ sơ — không có hồ sơ mẫu. Store KHÔNG tự tính lại chỉ
// số hay gọi API: việc đó của healthProfileService
// (hook useProfileData gọi service rồi nạp kết quả vào đây). Lịch sử cân nặng là server state nên ở
// TanStack Query, không ở store này.

interface UserProfileState {
  gender: Gender;
  dateOfBirth: Date;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  allergyIds: string[];
  healthConditionIds: string[];
  dietaryPreferenceIds: string[];
  /** Dị ứng ngoài danh mục tự gõ ("dứa, kiwi") — BE lọc món/cảnh báo theo; '' = không có. */
  otherAllergies: string;
  result: HealthProfileResult;
  /** WaterLogScreen (Đợt 12, BR-031 Daily Target) — mục tiêu nước/ngày, mặc định 2.000 ml. */
  waterGoalMl: number;
  initFromHealthProfile: (data: HealthProfileFormData, result: HealthProfileResult) => void;
  /** Nạp hồ sơ từ backend (đăng nhập, khởi động app, sau khi sửa hồ sơ) — `extras` là phần "Khác" BE không lưu. */
  hydrateFromServer: (snapshot: HealthProfileSnapshot, extras: HealthProfileExtras) => void;
}

function toDateOfBirth(data: HealthProfileFormData['dateOfBirth']): Date | null {
  const day = Number(data.day);
  const month = Number(data.month);
  const year = Number(data.year);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

type ProfileInitialState = Pick<
  UserProfileState,
  | 'gender'
  | 'dateOfBirth'
  | 'heightCm'
  | 'weightKg'
  | 'goalWeightKg'
  | 'activityLevel'
  | 'goal'
  | 'allergyIds'
  | 'healthConditionIds'
  | 'dietaryPreferenceIds'
  | 'otherAllergies'
  | 'result'
  | 'waterGoalMl'
>;

// Trạng thái "chưa có hồ sơ": giá trị trung tính, không phải số liệu giả. Ngày sinh vẫn là Date hợp
// lệ để mọi nơi format() không ném lỗi trước khi hydrate.
const INITIAL_PROFILE_STATE: ProfileInitialState = {
  gender: 'other',
  dateOfBirth: new Date(2000, 0, 1),
  heightCm: 0,
  weightKg: 0,
  goalWeightKg: 0,
  activityLevel: 'sedentary',
  goal: 'maintain',
  allergyIds: [],
  healthConditionIds: [],
  dietaryPreferenceIds: [],
  otherAllergies: '',
  result: {
    bmi: 0,
    bmr: 0,
    tdee: 0,
    calorieTarget: 0,
    macros: { proteinG: 0, carbsG: 0, fatG: 0 },
    goal: 'maintain',
  },
  waterGoalMl: 2000,
};

export const useUserProfileStore = create<UserProfileState>()((set, get) => ({
  ...INITIAL_PROFILE_STATE,

  // Hoàn tất wizard 7 bước (HealthResultScreen "Bắt đầu với SmartMeal"): đưa hồ sơ vừa nhập vào
  // store dùng chung. Lịch sử cân nặng do backend lo (tự thêm 1 dòng khi lưu hồ sơ).
  initFromHealthProfile: (data, result) => {
    const dateOfBirth = toDateOfBirth(data.dateOfBirth) ?? get().dateOfBirth;
    set({
      gender: data.gender ?? get().gender,
      dateOfBirth,
      heightCm: Number(data.heightCm) || get().heightCm,
      weightKg: Number(data.weightKg) || get().weightKg,
      goalWeightKg: Number(data.goalWeightKg) || get().goalWeightKg,
      activityLevel: data.activityLevel ?? get().activityLevel,
      goal: data.goal ?? get().goal,
      allergyIds: data.noAllergies ? [] : data.allergyIds,
      healthConditionIds: data.noHealthConditions ? [] : data.healthConditionIds,
      dietaryPreferenceIds: data.noDietaryPreference ? [] : data.dietaryPreferenceIds,
      otherAllergies: data.noAllergies ? '' : data.otherAllergyText.trim(),
      result,
    });
  },

  hydrateFromServer: (snapshot, extras) => {
    const selection = selectionFromServer(snapshot, extras);
    set({
      gender: snapshot.gender,
      // Ngày sinh BE lưu; hồ sơ cũ chưa có thì giữ ngày sinh đang có nếu còn khớp tuổi, không thì ước lượng.
      dateOfBirth: snapshot.dateOfBirth ?? resolveDateOfBirth(get().dateOfBirth, snapshot.age),
      heightCm: snapshot.heightCm,
      weightKg: snapshot.weightKg,
      goalWeightKg: snapshot.goalWeightKg,
      activityLevel: snapshot.activityLevel,
      goal: snapshot.goal,
      allergyIds: selection.allergyIds,
      healthConditionIds: selection.healthConditionIds,
      dietaryPreferenceIds: selection.dietaryPreferenceIds,
      otherAllergies: selection.otherAllergies ?? '',
      waterGoalMl: snapshot.waterGoalMl ?? get().waterGoalMl,
      result: snapshot.result,
    });
  },

}));

/** Đọc dị ứng hiện tại ngoài React tree (trong service, không dùng hook được) — dùng chung cho
 * nutrition/recipes/scanner để lọc/cảnh báo dị ứng nhất quán toàn app (BR-101/102, BR-140). */
export function getCurrentUserAllergyIds(): string[] {
  return useUserProfileStore.getState().allergyIds;
}

export function getCurrentUserDietaryPreferenceIds(): string[] {
  return useUserProfileStore.getState().dietaryPreferenceIds;
}

/** Đọc mục tiêu nước/ngày ngoài React tree — waterService dùng để tính WaterDaySummary.goalMl. */
export function getWaterGoalMl(): number {
  return useUserProfileStore.getState().waterGoalMl;
}

// BR-271 — đăng xuất/xóa dữ liệu: hồ sơ sức khỏe về lại trạng thái rỗng (xem src/state/resetUserData.ts).
registerUserDataReset('userProfile', () => useUserProfileStore.setState(INITIAL_PROFILE_STATE));
