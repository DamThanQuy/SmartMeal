import { create } from 'zustand';
import { ENV } from '@/config/env';
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
// feature thực sự cần"). Thay cho hằng số tạm CURRENT_USER_ALLERGY_IDS (nutrition/mocks) —
// TODO đã ghi từ Đợt 3/5: "Đợt 7 sẽ có store hồ sơ user đã đăng nhập dùng chung toàn app".
//
// Khi gọi API thật, store là bản sao ĐỒNG BỘ của hồ sơ trên server (docs/fetch-api/part1 §6.5):
// nhiều service đọc dị ứng/chế độ ăn đồng bộ nên không thể chờ query. Bắt đầu rỗng, được nạp bằng
// hydrateFromServer() lúc đăng nhập/khởi động app và sau mỗi lần sửa hồ sơ — tuyệt đối không hiện
// hồ sơ mẫu của mock. Store KHÔNG tự tính lại chỉ số hay gọi API: việc đó của healthProfileService
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
  result: HealthProfileResult;
  /** CalorieBudgetScreen (Đợt 11, BR-040→042) — "Cộng calo vận động vào ngân sách", mặc định bật. */
  includeActivityCalories: boolean;
  setIncludeActivityCalories: (value: boolean) => void;
  /** WaterLogScreen (Đợt 12, BR-031 Daily Target) — mục tiêu nước/ngày, mặc định 2.000 ml. */
  waterGoalMl: number;
  setWaterGoalMl: (value: number) => void;
  initFromHealthProfile: (data: HealthProfileFormData, result: HealthProfileResult) => void;
  /** Nạp hồ sơ từ backend (đăng nhập, khởi động app, sau khi sửa hồ sơ) — `extras` là phần BE không lưu. */
  hydrateFromServer: (snapshot: HealthProfileSnapshot, extras: HealthProfileExtras) => void;
  setAllergyIds: (ids: string[]) => void;
  setHealthConditionIds: (ids: string[]) => void;
  setDietaryPreferenceIds: (ids: string[]) => void;
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
  | 'result'
  | 'includeActivityCalories'
  | 'waterGoalMl'
>;

// Seed khớp design/Profile.dc.html (BMI 23,0 · BMR 1.655 · TDEE 2.276 · 68kg → mục tiêu 62kg)
// và CURRENT_USER_DAILY_TARGET (features/nutrition — 2.000 kcal, macro 120/250/65g) để Dashboard/
// Diary/ProgressChart/MealPlanner không lệch số khi nối vào store này. Input cơ thể (nam, 172cm,
// 24 tuổi, sedentary) là giá trị suy ra hợp lý để result ở trên khớp — CẦN xác nhận với backend
// khi có hồ sơ thật. allergyIds giữ ['dairy','peanut'] để nhất quán với toàn app (Đợt 3/4/5 đã
// dùng), khác với text tĩnh "Hải sản, Đậu phộng" trong design/Profile.dc.html (lệch design, xem
// báo cáo Đợt 7).
const SEED_PROFILE_STATE: ProfileInitialState = {
  gender: 'male',
  dateOfBirth: new Date(2002, 0, 15),
  heightCm: 172,
  weightKg: 68,
  goalWeightKg: 62,
  activityLevel: 'sedentary',
  goal: 'maintain',
  allergyIds: ['dairy', 'peanut'],
  healthConditionIds: [],
  dietaryPreferenceIds: ['eatClean'],
  result: {
    bmi: 23.0,
    bmr: 1655,
    tdee: 2276,
    calorieTarget: 2000,
    macros: { proteinG: 120, carbsG: 250, fatG: 65 },
    goal: 'maintain',
  },
  includeActivityCalories: true,
  waterGoalMl: 2000,
};

// Trạng thái "chưa có hồ sơ" khi gọi API thật: giá trị trung tính, không phải số liệu giả. Ngày
// sinh vẫn là Date hợp lệ để mọi nơi format() không ném lỗi trước khi hydrate.
const EMPTY_PROFILE_STATE: ProfileInitialState = {
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
  result: {
    bmi: 0,
    bmr: 0,
    tdee: 0,
    calorieTarget: 0,
    macros: { proteinG: 0, carbsG: 0, fatG: 0 },
    goal: 'maintain',
  },
  includeActivityCalories: true,
  waterGoalMl: 2000,
};

const INITIAL_PROFILE_STATE = ENV.useMockApi ? SEED_PROFILE_STATE : EMPTY_PROFILE_STATE;

export const useUserProfileStore = create<UserProfileState>()((set, get) => ({
  ...INITIAL_PROFILE_STATE,

  // Hoàn tất wizard 7 bước (HealthResultScreen "Bắt đầu với SmartMeal"): đưa hồ sơ vừa nhập vào
  // store dùng chung. Lịch sử cân nặng do service lo (mock tự ghi lúc submit; BE tự thêm 1 dòng).
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
      result,
    });
  },

  hydrateFromServer: (snapshot, extras) => {
    const selection = selectionFromServer(snapshot, extras);
    set({
      gender: snapshot.gender,
      // BE chỉ có tuổi: dùng ngày sinh nguồn dữ liệu biết, hoặc giữ ngày sinh đang có nếu còn khớp
      // tuổi, không thì ước lượng.
      dateOfBirth: snapshot.dateOfBirth ?? resolveDateOfBirth(get().dateOfBirth, snapshot.age),
      heightCm: snapshot.heightCm,
      weightKg: snapshot.weightKg,
      goalWeightKg: snapshot.goalWeightKg,
      activityLevel: snapshot.activityLevel,
      goal: snapshot.goal,
      allergyIds: selection.allergyIds,
      healthConditionIds: selection.healthConditionIds,
      dietaryPreferenceIds: selection.dietaryPreferenceIds,
      result: snapshot.result,
    });
  },

  setAllergyIds: ids => set({ allergyIds: ids }),
  setHealthConditionIds: ids => set({ healthConditionIds: ids }),
  setDietaryPreferenceIds: ids => set({ dietaryPreferenceIds: ids }),
  setIncludeActivityCalories: value => set({ includeActivityCalories: value }),
  setWaterGoalMl: value => set({ waterGoalMl: value }),
}));

/** Đọc dị ứng hiện tại ngoài React tree (trong service, không dùng hook được) — dùng chung cho
 * nutrition/recipes/scanner để lọc/cảnh báo dị ứng nhất quán toàn app (BR-101/102, BR-140). */
export function getCurrentUserAllergyIds(): string[] {
  return useUserProfileStore.getState().allergyIds;
}

export function getCurrentUserDietaryPreferenceIds(): string[] {
  return useUserProfileStore.getState().dietaryPreferenceIds;
}

/** Đọc công tắc "Cộng calo vận động" ngoài React tree — nutritionService dùng để tính
 * DiaryDaySummary.activityCalories qua calculateCalorieBudget (BR-040→042). */
export function getIncludeActivityCalories(): boolean {
  return useUserProfileStore.getState().includeActivityCalories;
}

/** Đọc mục tiêu nước/ngày ngoài React tree — waterService dùng để tính WaterDaySummary.goalMl. */
export function getWaterGoalMl(): number {
  return useUserProfileStore.getState().waterGoalMl;
}

// BR-271 — DeleteDataScreen: hồ sơ sức khỏe/cân nặng về lại giá trị khởi tạo (mô phỏng "xóa dữ
// liệu", vì mock-ui chưa có tài khoản thật để tạo hồ sơ rỗng — xem src/state/resetUserData.ts).
registerUserDataReset('userProfile', () => useUserProfileStore.setState(INITIAL_PROFILE_STATE));
