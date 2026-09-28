import { create } from 'zustand';
import {
  calculateHealthProfileResult,
  type ActivityLevel,
  type Gender,
  type HealthGoal,
  type HealthProfileFormData,
  type HealthProfileResult,
} from '@/features/health';
import { registerUserDataReset } from '@/state/resetUserData';

// Global client state — hồ sơ sức khỏe của user đã đăng nhập (dị ứng/bệnh lý/chế độ ăn/cân
// nặng), dùng chung cho nhiều feature (nutrition, recipes, scanner, meal-planner, profile) nên
// đặt ở src/state theo .claude/rules/architecture.md ("chỉ đưa vào global store khi nhiều
// feature thực sự cần"). Thay cho hằng số tạm CURRENT_USER_ALLERGY_IDS (nutrition/mocks) —
// TODO đã ghi từ Đợt 3/5: "Đợt 7 sẽ có store hồ sơ user đã đăng nhập dùng chung toàn app".

export interface WeightHistoryEntry {
  id: string;
  /** ISO date yyyy-MM-dd. */
  dateIso: string;
  weightKg: number;
}

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
  weightHistory: WeightHistoryEntry[];
  /** CalorieBudgetScreen (Đợt 11, BR-040→042) — "Cộng calo vận động vào ngân sách", mặc định bật. */
  includeActivityCalories: boolean;
  setIncludeActivityCalories: (value: boolean) => void;
  /** WaterLogScreen (Đợt 12, BR-031 Daily Target) — mục tiêu nước/ngày, mặc định 2.000 ml. */
  waterGoalMl: number;
  setWaterGoalMl: (value: number) => void;
  initFromHealthProfile: (data: HealthProfileFormData, result: HealthProfileResult) => void;
  setAllergyIds: (ids: string[]) => void;
  setHealthConditionIds: (ids: string[]) => void;
  setDietaryPreferenceIds: (ids: string[]) => void;
  /** BR-003 — ghi cân nặng mới → tính lại BMI→BMR→TDEE→Calorie→Macro qua đúng 1 công thức
   * (calculateHealthProfileResult, features/health) và thêm vào lịch sử cân nặng. */
  recordWeight: (weightKg: number, dateIso: string) => void;
  /** EditProfileScreen (Đợt 9, BR-003) — đổi giới tính/năm sinh/chiều cao cũng phải tính lại
   * BMI→BMR→TDEE→Calorie→Macro qua đúng calculateHealthProfileResult, giống recordWeight. */
  updateBasicInfo: (patch: { gender: Gender; dateOfBirth: Date; heightCm: number }) => void;
}

function toDateOfBirth(data: HealthProfileFormData['dateOfBirth']): Date | null {
  const day = Number(data.day);
  const month = Number(data.month);
  const year = Number(data.year);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

let weightHistoryIdCounter = 0;
function nextWeightHistoryId(): string {
  weightHistoryIdCounter += 1;
  return `weight-${Date.now()}-${weightHistoryIdCounter}`;
}

// Seed khớp design/Profile.dc.html (BMI 23,0 · BMR 1.655 · TDEE 2.276 · 68kg → mục tiêu 62kg)
// và CURRENT_USER_DAILY_TARGET (features/nutrition — 2.000 kcal, macro 120/250/65g) để Dashboard/
// Diary/ProgressChart/MealPlanner không lệch số khi nối vào store này. Input cơ thể (nam, 172cm,
// 24 tuổi, sedentary) là giá trị suy ra hợp lý để result ở trên khớp — CẦN xác nhận với backend
// khi có hồ sơ thật. allergyIds giữ ['dairy','peanut'] để nhất quán với toàn app (Đợt 3/4/5 đã
// dùng), khác với text tĩnh "Hải sản, Đậu phộng" trong design/Profile.dc.html (lệch design, xem
// báo cáo Đợt 7).
const INITIAL_PROFILE_STATE: Pick<
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
  | 'weightHistory'
  | 'includeActivityCalories'
  | 'waterGoalMl'
> = {
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
  weightHistory: [
    { id: 'weight-seed-4', dateIso: '2026-09-27', weightKg: 68.0 },
    { id: 'weight-seed-3', dateIso: '2026-09-20', weightKg: 68.6 },
    { id: 'weight-seed-2', dateIso: '2026-09-13', weightKg: 69.2 },
    { id: 'weight-seed-1', dateIso: '2026-09-06', weightKg: 69.5 },
  ],
  includeActivityCalories: true,
  waterGoalMl: 2000,
};

export const useUserProfileStore = create<UserProfileState>()((set, get) => ({
  ...INITIAL_PROFILE_STATE,

  initFromHealthProfile: (data, result) => {
    const dateOfBirth = toDateOfBirth(data.dateOfBirth) ?? get().dateOfBirth;
    const weightKg = Number(data.weightKg) || get().weightKg;
    set({
      gender: data.gender ?? get().gender,
      dateOfBirth,
      heightCm: Number(data.heightCm) || get().heightCm,
      weightKg,
      goalWeightKg: Number(data.goalWeightKg) || get().goalWeightKg,
      activityLevel: data.activityLevel ?? get().activityLevel,
      goal: data.goal ?? get().goal,
      allergyIds: data.noAllergies ? [] : data.allergyIds,
      healthConditionIds: data.noHealthConditions ? [] : data.healthConditionIds,
      dietaryPreferenceIds: data.noDietaryPreference ? [] : data.dietaryPreferenceIds,
      result,
      weightHistory: [
        { id: nextWeightHistoryId(), dateIso: new Date().toISOString().slice(0, 10), weightKg },
        ...get().weightHistory,
      ],
    });
  },

  setAllergyIds: ids => set({ allergyIds: ids }),
  setHealthConditionIds: ids => set({ healthConditionIds: ids }),
  setDietaryPreferenceIds: ids => set({ dietaryPreferenceIds: ids }),
  setIncludeActivityCalories: value => set({ includeActivityCalories: value }),
  setWaterGoalMl: value => set({ waterGoalMl: value }),

  recordWeight: (weightKg, dateIso) => {
    const state = get();
    const result = calculateHealthProfileResult({
      gender: state.gender,
      dateOfBirth: state.dateOfBirth,
      heightCm: state.heightCm,
      weightKg,
      activityLevel: state.activityLevel,
      goal: state.goal,
    });
    set({
      weightKg,
      result,
      weightHistory: [{ id: nextWeightHistoryId(), dateIso, weightKg }, ...state.weightHistory],
    });
  },

  updateBasicInfo: patch => {
    const state = get();
    const result = calculateHealthProfileResult({
      gender: patch.gender,
      dateOfBirth: patch.dateOfBirth,
      heightCm: patch.heightCm,
      weightKg: state.weightKg,
      activityLevel: state.activityLevel,
      goal: state.goal,
    });
    set({ ...patch, result });
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
