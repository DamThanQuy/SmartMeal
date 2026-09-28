import type {
  ActivityLevel,
  Gender,
  HealthGoal,
  MacroTargets,
  HealthProfileResult,
} from '../types/health.types';

// BR-023 — TDEE = BMR × Activity Factor. Hệ số hoạt động chuẩn Mifflin-St Jeor/Harris-Benedict
// (business_rule.md không chỉ định số cụ thể — CẦN xác nhận nếu backend dùng bộ hệ số khác).
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

// BR-024 — Calorie Target theo TDEE và mục tiêu. Mức điều chỉnh (-500/0/+300 kcal) là mức phổ
// biến, an toàn (≈0.5kg/tuần khi giảm) — CẦN xác nhận với backend vì BR không định nghĩa số cụ thể.
const CALORIE_ADJUSTMENT_BY_GOAL: Record<HealthGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

const MIN_CALORIE_TARGET = 1200;

// BR-030 — tỉ lệ macro cố định (không đổi theo goal) để đơn giản hoá cho MVP mock.
const MACRO_RATIO = { protein: 0.25, fat: 0.25, carbs: 0.5 };

const KCAL_PER_GRAM_PROTEIN = 4;
const KCAL_PER_GRAM_CARBS = 4;
const KCAL_PER_GRAM_FAT = 9;

export function calculateAge(dateOfBirth: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  const hasNotHadBirthdayYet =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate());
  if (hasNotHadBirthdayYet) {
    age -= 1;
  }
  return age;
}

// BR-021 — BMI = Weight(kg) / Height(m)^2.
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

// BR-022 — BMR theo công thức Mifflin-St Jeor (chưa có backend để đối chiếu "công thức thống
// nhất" — CẦN xác nhận). Gender 'other' dùng trung bình 2 hệ số nam/nữ làm giá trị phỏng đoán
// hợp lý (BR không định nghĩa trường hợp này).
export function calculateBmr(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base + (5 + -161) / 2;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

export function calculateCalorieTarget(tdee: number, goal: HealthGoal): number {
  return Math.max(MIN_CALORIE_TARGET, Math.round(tdee + CALORIE_ADJUSTMENT_BY_GOAL[goal]));
}

export function calculateMacroTargets(calorieTarget: number): MacroTargets {
  return {
    proteinG: Math.round((calorieTarget * MACRO_RATIO.protein) / KCAL_PER_GRAM_PROTEIN),
    carbsG: Math.round((calorieTarget * MACRO_RATIO.carbs) / KCAL_PER_GRAM_CARBS),
    fatG: Math.round((calorieTarget * MACRO_RATIO.fat) / KCAL_PER_GRAM_FAT),
  };
}

export interface HealthProfileResultInput {
  gender: Gender;
  dateOfBirth: Date;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: HealthGoal;
}

// BR-003 — Cân nặng thay đổi → tính lại BMI → BMR → TDEE → Calorie Target → Macro Target,
// luôn qua đúng 1 hàm này để đảm bảo nhất quán giữa Health Profile và Weight History (Đợt 7).
export function calculateHealthProfileResult(
  input: HealthProfileResultInput,
): HealthProfileResult {
  const age = calculateAge(input.dateOfBirth);
  const bmi = calculateBmi(input.weightKg, input.heightCm);
  const bmr = calculateBmr(input.gender, input.weightKg, input.heightCm, age);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const calorieTarget = calculateCalorieTarget(tdee, input.goal);
  const macros = calculateMacroTargets(calorieTarget);

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    macros,
    goal: input.goal,
  };
}
