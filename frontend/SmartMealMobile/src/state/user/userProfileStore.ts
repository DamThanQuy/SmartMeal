import { create } from 'zustand';
import {
  calculateHealthProfileResult,
  type ActivityLevel,
  type Gender,
  type HealthGoal,
  type HealthProfileFormData,
  type HealthProfileResult,
} from '@/features/health';

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
  initFromHealthProfile: (data: HealthProfileFormData, result: HealthProfileResult) => void;
  setAllergyIds: (ids: string[]) => void;
  setHealthConditionIds: (ids: string[]) => void;
  setDietaryPreferenceIds: (ids: string[]) => void;
  /** BR-003 — ghi cân nặng mới → tính lại BMI→BMR→TDEE→Calorie→Macro qua đúng 1 công thức
   * (calculateHealthProfileResult, features/health) và thêm vào lịch sử cân nặng. */
  recordWeight: (weightKg: number, dateIso: string) => void;
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
export const useUserProfileStore = create<UserProfileState>()((set, get) => ({
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
}));

/** Đọc dị ứng hiện tại ngoài React tree (trong service, không dùng hook được) — dùng chung cho
 * nutrition/recipes/scanner để lọc/cảnh báo dị ứng nhất quán toàn app (BR-101/102, BR-140). */
export function getCurrentUserAllergyIds(): string[] {
  return useUserProfileStore.getState().allergyIds;
}

export function getCurrentUserDietaryPreferenceIds(): string[] {
  return useUserProfileStore.getState().dietaryPreferenceIds;
}
