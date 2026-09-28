/**
 * @format
 */

import {
  ACTIVITY_FACTORS,
  calculateAge,
  calculateBmi,
  calculateBmr,
  calculateCalorieTarget,
  calculateHealthProfileResult,
  calculateMacroTargets,
  calculateTdee,
} from '../src/features/health/services/healthCalculator';

describe('calculateAge (BR-020)', () => {
  test('trừ 1 tuổi nếu chưa tới sinh nhật trong năm nay', () => {
    const dateOfBirth = new Date(2000, 5, 15); // 15/06/2000
    const today = new Date(2024, 4, 1); // 01/05/2024 — chưa tới sinh nhật
    expect(calculateAge(dateOfBirth, today)).toBe(23);
  });

  test('tính đủ tuổi khi đã qua sinh nhật trong năm', () => {
    const dateOfBirth = new Date(2000, 5, 15);
    const today = new Date(2024, 6, 1); // 01/07/2024 — đã qua sinh nhật
    expect(calculateAge(dateOfBirth, today)).toBe(24);
  });
});

describe('calculateBmi (BR-021)', () => {
  test('BMI = weight(kg) / height(m)^2', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.86, 2);
  });
});

describe('calculateBmr (BR-022, Mifflin-St Jeor)', () => {
  test('nam: 10*w + 6.25*h - 5*age + 5', () => {
    expect(calculateBmr('male', 70, 175, 30)).toBeCloseTo(1648.75, 2);
  });

  test('nữ: 10*w + 6.25*h - 5*age - 161', () => {
    expect(calculateBmr('female', 60, 165, 25)).toBeCloseTo(1345.25, 2);
  });

  test('other: trung bình offset nam/nữ (chưa có BR quy định — giá trị phỏng đoán)', () => {
    const base = 10 * 65 + 6.25 * 170 - 5 * 28;
    expect(calculateBmr('other', 65, 170, 28)).toBeCloseTo(base + (5 - 161) / 2, 2);
  });
});

describe('calculateTdee (BR-023)', () => {
  test('TDEE = BMR × activity factor', () => {
    expect(calculateTdee(1600, 'sedentary')).toBeCloseTo(1600 * ACTIVITY_FACTORS.sedentary, 2);
    expect(calculateTdee(1600, 'active')).toBeCloseTo(1600 * ACTIVITY_FACTORS.active, 2);
  });
});

describe('calculateCalorieTarget (BR-024)', () => {
  const tdee = 2000;

  test('giảm cân → TDEE - 500', () => {
    expect(calculateCalorieTarget(tdee, 'lose')).toBe(1500);
  });

  test('giữ cân → xấp xỉ TDEE', () => {
    expect(calculateCalorieTarget(tdee, 'maintain')).toBe(2000);
  });

  test('tăng cân → TDEE + 300', () => {
    expect(calculateCalorieTarget(tdee, 'gain')).toBe(2300);
  });

  test('không xuống dưới ngưỡng an toàn tối thiểu', () => {
    expect(calculateCalorieTarget(1300, 'lose')).toBe(1200);
  });
});

describe('calculateMacroTargets (BR-030)', () => {
  test('protein 25% / carbs 50% / fat 25% theo calorie target', () => {
    const macros = calculateMacroTargets(2000);
    expect(macros.proteinG).toBe(125);
    expect(macros.carbsG).toBe(250);
    expect(macros.fatG).toBe(56);
  });
});

describe('calculateHealthProfileResult (BR-003 — chuỗi tính toán đầy đủ)', () => {
  test('trả về BMI/BMR/TDEE/calorieTarget/macros nhất quán với từng hàm con', () => {
    const input = {
      gender: 'male' as const,
      dateOfBirth: new Date(1995, 0, 1),
      heightCm: 175,
      weightKg: 70,
      activityLevel: 'light' as const,
      goal: 'lose' as const,
    };

    const result = calculateHealthProfileResult(input);

    expect(result.bmi).toBeCloseTo(calculateBmi(70, 175), 1);
    expect(result.goal).toBe('lose');
    expect(result.calorieTarget).toBeLessThan(result.tdee);
    expect(result.macros.proteinG).toBeGreaterThan(0);
    expect(result.macros.carbsG).toBeGreaterThan(0);
    expect(result.macros.fatG).toBeGreaterThan(0);
  });
});
