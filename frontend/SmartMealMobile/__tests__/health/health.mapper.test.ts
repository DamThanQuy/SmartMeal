/**
 * health.mapper (docs/fetch-api/part1 §6.2–§6.3): quy đổi form/hồ sơ FE ↔ DTO của BE. Fixture
 * khớp HealthProfileDto/HealthSurveyRequestDto trong backend (JSON camelCase).
 */
import {
  activityLevelFromApi,
  approximateDateOfBirth,
  extrasFromSelection,
  fromHealthProfileDto,
  genderFromApi,
  goalFromApi,
  profileInputFromForm,
  resolveDateOfBirth,
  selectionFromForm,
  selectionFromServer,
  toHealthProfileResult,
  toSurveyRequest,
} from '@/features/health/services/health.mapper';
import type { HealthProfileDto } from '@/features/health/types/health.api.types';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileFormData,
  type HealthProfileInput,
} from '@/features/health/types/health.types';

const TODAY = new Date(2026, 9, 2); // 02/10/2026

function createForm(overrides: Partial<HealthProfileFormData> = {}): HealthProfileFormData {
  return {
    ...createEmptyHealthProfileFormData(),
    dateOfBirth: { day: '15', month: '1', year: '2002' },
    gender: 'male',
    heightCm: '172',
    weightKg: '68',
    goal: 'lose',
    goalWeightKg: '62',
    activityLevel: 'light',
    allergyIds: ['seafood', 'treeNut'],
    healthConditionIds: ['diabetes', 'other'],
    dietaryPreferenceIds: ['keto', 'lowCarb'],
    ...overrides,
  };
}

const PROFILE_DTO: HealthProfileDto = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  gender: 'Male',
  age: 24,
  heightCm: 172,
  currentWeightKg: 68,
  targetWeightKg: 62,
  activityLevel: 'Light',
  goal: 'LoseWeight',
  bmi: 23,
  bmiClassification: 'Bình thường (Normal)',
  bmr: 1655.0000000000002,
  tdee: 2275.625,
  dailyCaloriesTarget: 1776,
  dailyCarbsTargetGrams: 222.0,
  dailyFatTargetGrams: 49.33333,
  dailyProteinTargetGrams: 111.4,
  allergies: ['Hải sản (Seafood)', 'Sữa động vật (Dairy)'],
  medicalConditions: ['Tiểu đường (Diabetes)', 'Mỡ máu cao (Dyslipidemia)'],
};

describe('profileInputFromForm / selectionFromForm', () => {
  test('đổi chuỗi của wizard sang số, ngày sinh sang Date (giờ máy)', () => {
    const input = profileInputFromForm(createForm());

    expect(input.dateOfBirth).toEqual(new Date(2002, 0, 15));
    expect(input).toMatchObject({
      gender: 'male',
      heightCm: 172,
      weightKg: 68,
      goalWeightKg: 62,
      activityLevel: 'light',
      goal: 'lose',
    });
  });

  test('chưa chọn → giá trị mặc định như bản mock cũ; chưa nhập cân nặng mục tiêu → bằng cân nặng', () => {
    const input = profileInputFromForm(
      createForm({ gender: null, activityLevel: null, goal: null, goalWeightKg: '' }),
    );

    expect(input.gender).toBe('other');
    expect(input.activityLevel).toBe('sedentary');
    expect(input.goal).toBe('maintain');
    expect(input.goalWeightKg).toBe(68);
  });

  test('"Không có" thắng danh sách đã tick', () => {
    const selection = selectionFromForm(
      createForm({ noAllergies: true, noHealthConditions: true, noDietaryPreference: true }),
    );

    expect(selection).toEqual({
      allergyIds: [],
      healthConditionIds: [],
      dietaryPreferenceIds: [],
    });
  });
});

describe('toSurveyRequest', () => {
  test('quy đổi enum sang PascalCase, tuổi từ ngày sinh, slug sang id BE', () => {
    const request = toSurveyRequest(profileInputFromForm(createForm()), TODAY);

    expect(request).toEqual({
      gender: 'Male',
      age: 24,
      heightCm: 172,
      currentWeightKg: 68,
      targetWeightKg: 62,
      activityLevel: 'Light',
      goal: 'LoseWeight',
      allergyIds: [1],
      medicalConditionIds: [1],
    });
  });

  test('slug không có id trên BE (treeNut, sesame, other) bị bỏ, id không trùng', () => {
    const input: HealthProfileInput = {
      ...profileInputFromForm(createForm()),
      allergyIds: ['peanut', 'treeNut', 'sesame', 'other', 'peanut'],
      healthConditionIds: ['other', 'hypertension'],
    };

    const request = toSurveyRequest(input, TODAY);

    expect(request.allergyIds).toEqual([2]);
    expect(request.medicalConditionIds).toEqual([3]);
  });

  test.each([
    ['male', 'Male'],
    ['female', 'Female'],
    ['other', 'Other'],
  ] as const)('gender %s → %s', (gender, expected) => {
    const request = toSurveyRequest({ ...profileInputFromForm(createForm()), gender }, TODAY);
    expect(request.gender).toBe(expected);
  });

  test.each([
    ['sedentary', 'Sedentary'],
    ['light', 'Light'],
    ['moderate', 'Moderate'],
    ['active', 'Active'],
    ['veryActive', 'VeryActive'],
  ] as const)('activityLevel %s → %s', (activityLevel, expected) => {
    const request = toSurveyRequest(
      { ...profileInputFromForm(createForm()), activityLevel },
      TODAY,
    );
    expect(request.activityLevel).toBe(expected);
  });

  test.each([
    ['lose', 'LoseWeight'],
    ['maintain', 'Maintain'],
    ['gain', 'GainWeight'],
  ] as const)('goal %s → %s', (goal, expected) => {
    const request = toSurveyRequest({ ...profileInputFromForm(createForm()), goal }, TODAY);
    expect(request.goal).toBe(expected);
  });
});

describe('quy đổi ngược enum từ BE', () => {
  test('không phân biệt hoa/thường, giá trị lạ rơi về mặc định an toàn', () => {
    expect(genderFromApi('FEMALE')).toBe('female');
    expect(genderFromApi('Male')).toBe('male');
    expect(genderFromApi('Khác')).toBe('other');

    expect(activityLevelFromApi('VeryActive')).toBe('veryActive');
    expect(activityLevelFromApi('light')).toBe('light');
    expect(activityLevelFromApi('???')).toBe('sedentary');

    expect(goalFromApi('LoseWeight')).toBe('lose');
    expect(goalFromApi('GainWeight')).toBe('gain');
    expect(goalFromApi('GainMuscle')).toBe('gain');
    expect(goalFromApi('Maintain')).toBe('maintain');
    expect(goalFromApi('')).toBe('maintain');
  });
});

describe('toHealthProfileResult / fromHealthProfileDto', () => {
  test('làm tròn số thực của BE, giữ BMI nguyên', () => {
    expect(toHealthProfileResult(PROFILE_DTO)).toEqual({
      bmi: 23,
      bmr: 1655,
      tdee: 2276,
      calorieTarget: 1776,
      macros: { proteinG: 111, carbsG: 222, fatG: 49 },
      goal: 'lose',
    });
  });

  test('đổi tên dị ứng/bệnh lý của BE về slug FE, bỏ tên FE chưa có (Mỡ máu cao)', () => {
    const snapshot = fromHealthProfileDto(PROFILE_DTO);

    expect(snapshot).toMatchObject({
      gender: 'male',
      age: 24,
      heightCm: 172,
      weightKg: 68,
      goalWeightKg: 62,
      activityLevel: 'light',
      goal: 'lose',
      allergyIds: ['seafood', 'dairy'],
      healthConditionIds: ['diabetes'],
    });
    expect(snapshot.result.calorieTarget).toBe(1776);
  });

  test('hồ sơ không có dị ứng/bệnh lý → mảng rỗng', () => {
    const snapshot = fromHealthProfileDto({
      ...PROFILE_DTO,
      allergies: [],
      medicalConditions: [],
    });

    expect(snapshot.allergyIds).toEqual([]);
    expect(snapshot.healthConditionIds).toEqual([]);
  });
});

describe('phần hồ sơ giữ cục bộ (extras)', () => {
  test('extrasFromSelection chỉ giữ slug BE không có id', () => {
    const extras = extrasFromSelection({
      allergyIds: ['seafood', 'treeNut', 'sesame', 'other'],
      healthConditionIds: ['diabetes', 'other'],
      dietaryPreferenceIds: ['keto', 'lowCarb'],
    });

    expect(extras).toEqual({
      dietaryPreferenceIds: ['keto', 'lowCarb'],
      localAllergyIds: ['treeNut', 'sesame', 'other'],
      localHealthConditionIds: ['other'],
    });
  });

  test('selectionFromServer ghép mục có id (BE) với mục chỉ có ở máy, không trùng', () => {
    const selection = selectionFromServer(
      { allergyIds: ['seafood', 'dairy'], healthConditionIds: ['diabetes'] },
      {
        dietaryPreferenceIds: ['keto'],
        localAllergyIds: ['treeNut', 'seafood'],
        localHealthConditionIds: ['other'],
      },
    );

    expect(selection).toEqual({
      allergyIds: ['seafood', 'dairy', 'treeNut'],
      healthConditionIds: ['diabetes', 'other'],
      dietaryPreferenceIds: ['keto'],
    });
  });

  test('chọn → gửi BE/giữ máy → ghép lại cho ra đúng lựa chọn ban đầu', () => {
    const chosen = {
      allergyIds: ['peanut', 'sesame'],
      healthConditionIds: ['gout', 'other'],
      dietaryPreferenceIds: ['vegan'],
    };

    const extras = extrasFromSelection(chosen);
    const input: HealthProfileInput = {
      ...profileInputFromForm(createForm()),
      allergyIds: chosen.allergyIds,
      healthConditionIds: chosen.healthConditionIds,
    };
    const request = toSurveyRequest(input, TODAY);
    // BE lưu id 2 (Đậu phộng) và 2 (Gout) → trả về tên.
    const snapshot = fromHealthProfileDto({
      ...PROFILE_DTO,
      allergies: ['Đậu phộng (Peanuts)'],
      medicalConditions: ['Gout (Axit Uric cao)'],
    });

    expect(request.allergyIds).toEqual([2]);
    expect(request.medicalConditionIds).toEqual([2]);
    expect(selectionFromServer(snapshot, extras)).toEqual({
      allergyIds: ['peanut', 'sesame'],
      healthConditionIds: ['gout', 'other'],
      dietaryPreferenceIds: ['vegan'],
    });
  });
});

describe('ngày sinh ước lượng (BE chỉ lưu tuổi)', () => {
  test('approximateDateOfBirth = 01/01 của (năm nay − tuổi)', () => {
    expect(approximateDateOfBirth(24, TODAY)).toEqual(new Date(2002, 0, 1));
  });

  test('resolveDateOfBirth giữ ngày sinh đang có nếu vẫn khớp tuổi BE', () => {
    const current = new Date(2002, 0, 15);
    expect(resolveDateOfBirth(current, 24, TODAY)).toBe(current);
  });

  test('resolveDateOfBirth ước lượng lại khi ngày sinh đang có lệch tuổi BE hoặc không hợp lệ', () => {
    expect(resolveDateOfBirth(new Date(1990, 5, 1), 24, TODAY)).toEqual(new Date(2002, 0, 1));
    expect(resolveDateOfBirth(new Date(Number.NaN), 30, TODAY)).toEqual(new Date(1996, 0, 1));
  });
});
