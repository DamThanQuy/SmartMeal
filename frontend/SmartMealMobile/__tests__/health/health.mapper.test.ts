/**
 * health.mapper (docs/fetch-api/part1 §6.2–§6.3): quy đổi form/hồ sơ FE ↔ DTO của BE. Fixture
 * khớp HealthProfileDto/HealthSurveyRequestDto trong backend (JSON camelCase). Ánh xạ dị ứng/bệnh
 * lý/chế độ ăn đi qua MetaCatalog (slug FE ↔ id BE theo `code`).
 */
import {
  activityLevelFromApi,
  approximateDateOfBirth,
  extrasFromSelection,
  fromHealthProfileDto,
  fromWeightHistoryDto,
  genderFromApi,
  goalFromApi,
  profileInputFromForm,
  resolveDateOfBirth,
  selectionFromForm,
  selectionFromServer,
  snapshotFromInput,
  toBasicInfoUpdateRequest,
  toHealthProfileResult,
  toRecordedAtIso,
  toSelectionUpdateRequest,
  toSurveyRequest,
} from '@/features/health/services/health.mapper';
import type { MetaCatalog } from '@/features/health/services/metaLookup';
import type {
  HealthProfileDto,
  WeightHistoryResponse,
} from '@/features/health/types/health.api.types';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileFormData,
  type HealthProfileInput,
} from '@/features/health/types/health.types';
import { createTestCatalog } from '../../test-utils/metaCatalog';

const TODAY = new Date(2026, 9, 2); // 02/10/2026

let catalog: MetaCatalog;

beforeAll(async () => {
  catalog = await createTestCatalog();
});

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
  dateOfBirth: '2002-01-15',
  heightCm: 172,
  currentWeightKg: 68,
  targetWeightKg: 62,
  activityLevel: 'Light',
  goal: 'LoseWeight',
  waterGoalMl: 2200,
  bmi: 23,
  bmiClassification: 'Bình thường (Normal)',
  bmr: 1655.0000000000002,
  tdee: 2275.625,
  dailyCaloriesTarget: 1776,
  dailyCarbsTargetGrams: 222.0,
  dailyFatTargetGrams: 49.33333,
  dailyProteinTargetGrams: 111.4,
  allergyIds: [1, 3],
  medicalConditionIds: [1, 4],
  dietaryPreferenceIds: [2, 7],
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
      dietaryPreferenceIds: ['keto', 'lowCarb'],
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
  test('gửi NGÀY SINH thật (không còn tuổi), enum PascalCase, slug → id BE theo code', () => {
    const request = toSurveyRequest(profileInputFromForm(createForm()), catalog);

    expect(request).toEqual({
      gender: 'Male',
      dateOfBirth: '2002-01-15',
      heightCm: 172,
      currentWeightKg: 68,
      targetWeightKg: 62,
      activityLevel: 'Light',
      goal: 'LoseWeight',
      allergyIds: [1, 7], // seafood, treeNut — nay đều có trên BE
      medicalConditionIds: [1], // diabetes; "other" không có trên BE
      dietaryPreferenceIds: [2, 7], // keto, lowCarb — chế độ ăn nay do BE lưu
    });
  });

  test('ngày sinh theo giờ máy, không lệch một ngày do UTC', () => {
    const request = toSurveyRequest(
      { ...profileInputFromForm(createForm()), dateOfBirth: new Date(2002, 0, 1, 0, 30) },
      catalog,
    );

    expect(request.dateOfBirth).toBe('2002-01-01');
  });

  test('slug không có trên BE ("other") bị bỏ, id không trùng', () => {
    const input: HealthProfileInput = {
      ...profileInputFromForm(createForm()),
      allergyIds: ['peanut', 'sesame', 'other', 'peanut'],
      healthConditionIds: ['other', 'hypertension'],
    };

    const request = toSurveyRequest(input, catalog);

    expect(request.allergyIds).toEqual([2, 8]);
    expect(request.medicalConditionIds).toEqual([3]);
  });

  test.each([
    ['male', 'Male'],
    ['female', 'Female'],
    ['other', 'Other'],
  ] as const)('gender %s → %s', (gender, expected) => {
    const request = toSurveyRequest({ ...profileInputFromForm(createForm()), gender }, catalog);
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
      catalog,
    );
    expect(request.activityLevel).toBe(expected);
  });

  test.each([
    ['lose', 'LoseWeight'],
    ['maintain', 'Maintain'],
    ['gain', 'GainWeight'],
  ] as const)('goal %s → %s', (goal, expected) => {
    const request = toSurveyRequest({ ...profileInputFromForm(createForm()), goal }, catalog);
    expect(request.goal).toBe(expected);
  });
});

describe('cập nhật từng phần (PUT /healthprofile)', () => {
  test('toBasicInfoUpdateRequest chỉ gồm giới tính, ngày sinh, chiều cao', () => {
    expect(
      toBasicInfoUpdateRequest({ gender: 'female', dateOfBirth: new Date(1999, 11, 31), heightCm: 165 }),
    ).toEqual({ gender: 'Female', dateOfBirth: '1999-12-31', heightCm: 165 });
  });

  test('toSelectionUpdateRequest luôn gửi đủ ba danh sách; rỗng nghĩa là xóa hết', () => {
    expect(
      toSelectionUpdateRequest(
        { allergyIds: ['soy', 'other'], healthConditionIds: [], dietaryPreferenceIds: ['vegan'] },
        catalog,
      ),
    ).toEqual({ allergyIds: [6], medicalConditionIds: [], dietaryPreferenceIds: [3] });

    expect(
      toSelectionUpdateRequest(
        { allergyIds: [], healthConditionIds: [], dietaryPreferenceIds: [] },
        catalog,
      ),
    ).toEqual({ allergyIds: [], medicalConditionIds: [], dietaryPreferenceIds: [] });
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

  test('đổi id dị ứng/bệnh lý/chế độ ăn của BE về slug FE theo code; có ngày sinh và mục tiêu nước', () => {
    const snapshot = fromHealthProfileDto(PROFILE_DTO, catalog);

    expect(snapshot).toMatchObject({
      gender: 'male',
      age: 24,
      dateOfBirth: new Date(2002, 0, 15),
      heightCm: 172,
      weightKg: 68,
      goalWeightKg: 62,
      activityLevel: 'light',
      goal: 'lose',
      allergyIds: ['seafood', 'dairy'],
      healthConditionIds: ['diabetes', 'dyslipidemia'],
      dietaryPreferenceIds: ['keto', 'lowCarb'],
      waterGoalMl: 2200,
    });
    expect(snapshot.result.calorieTarget).toBe(1776);
  });

  test('hồ sơ cũ chưa có ngày sinh → dateOfBirth undefined (store sẽ ước lượng từ tuổi)', () => {
    const snapshot = fromHealthProfileDto({ ...PROFILE_DTO, dateOfBirth: null }, catalog);

    expect(snapshot.dateOfBirth).toBeUndefined();
    expect(snapshot.age).toBe(24);
  });

  test('id lạ (BE thêm mục mới mà FE chưa biết) bị bỏ, không làm hỏng hồ sơ', () => {
    const snapshot = fromHealthProfileDto(
      { ...PROFILE_DTO, allergyIds: [1, 99], medicalConditionIds: [77], dietaryPreferenceIds: [] },
      catalog,
    );

    expect(snapshot.allergyIds).toEqual(['seafood']);
    expect(snapshot.healthConditionIds).toEqual([]);
    expect(snapshot.dietaryPreferenceIds).toEqual([]);
  });

  test('hồ sơ không có dị ứng/bệnh lý → mảng rỗng', () => {
    const snapshot = fromHealthProfileDto(
      { ...PROFILE_DTO, allergyIds: [], medicalConditionIds: [], dietaryPreferenceIds: [] },
      catalog,
    );

    expect(snapshot.allergyIds).toEqual([]);
    expect(snapshot.healthConditionIds).toEqual([]);
  });
});

describe('phần hồ sơ giữ cục bộ (extras)', () => {
  test('extrasFromSelection chỉ giữ slug BE không có (vd. "other")', () => {
    const extras = extrasFromSelection(
      {
        allergyIds: ['seafood', 'treeNut', 'sesame', 'other'],
        healthConditionIds: ['diabetes', 'other'],
        dietaryPreferenceIds: ['keto', 'lowCarb'],
      },
      catalog,
    );

    expect(extras).toEqual({ localAllergyIds: ['other'], localHealthConditionIds: ['other'] });
  });

  test('selectionFromServer ghép mục BE lưu với mục "Khác" ở máy, không trùng', () => {
    const selection = selectionFromServer(
      { allergyIds: ['seafood', 'dairy'], healthConditionIds: ['diabetes'], dietaryPreferenceIds: ['keto'] },
      { localAllergyIds: ['other', 'seafood'], localHealthConditionIds: ['other'] },
    );

    expect(selection).toEqual({
      allergyIds: ['seafood', 'dairy', 'other'],
      healthConditionIds: ['diabetes', 'other'],
      dietaryPreferenceIds: ['keto'],
    });
  });

  test('chọn → gửi BE/giữ máy → ghép lại cho ra đúng lựa chọn ban đầu', () => {
    const chosen = {
      allergyIds: ['peanut', 'sesame', 'other'],
      healthConditionIds: ['gout', 'other'],
      dietaryPreferenceIds: ['vegan'],
    };

    const extras = extrasFromSelection(chosen, catalog);
    const request = toSelectionUpdateRequest(chosen, catalog);
    // BE lưu đúng các id đã nhận rồi trả về.
    const snapshot = fromHealthProfileDto(
      {
        ...PROFILE_DTO,
        allergyIds: request.allergyIds ?? [],
        medicalConditionIds: request.medicalConditionIds ?? [],
        dietaryPreferenceIds: request.dietaryPreferenceIds ?? [],
      },
      catalog,
    );

    expect(request).toEqual({ allergyIds: [2, 8], medicalConditionIds: [2], dietaryPreferenceIds: [3] });
    expect(selectionFromServer(snapshot, extras)).toEqual({
      allergyIds: ['peanut', 'sesame', 'other'],
      healthConditionIds: ['gout', 'other'],
      dietaryPreferenceIds: ['vegan'],
    });
  });
});

describe('ngày sinh ước lượng (chỉ cho hồ sơ cũ chưa có ngày sinh)', () => {
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

describe('fromWeightHistoryDto', () => {
  const dto: WeightHistoryResponse = {
    currentWeightKg: 68,
    targetWeightKg: 62,
    initialWeightKg: 69.5,
    totalWeightChangedKg: -1.5,
    bmi: 23,
    bmiCategory: 'Bình thường',
    // BE trả cũ → mới.
    history: [
      { id: 'w1', weightKg: 69.5, recordedAt: '2026-09-06T03:00:00Z', diffFromTargetKg: 7.5 },
      { id: 'w2', weightKg: 68.6, recordedAt: '2026-09-20T03:00:00.1234567Z', diffFromTargetKg: 6.6 },
      { id: 'w3', weightKg: 68, recordedAt: '2026-09-27T03:00:00', diffFromTargetKg: 6 },
    ],
  };

  test('đảo thành mới → cũ, giữ id và cân nặng', () => {
    const entries = fromWeightHistoryDto(dto);

    expect(entries.map(entry => entry.id)).toEqual(['w3', 'w2', 'w1']);
    expect(entries.map(entry => entry.weightKg)).toEqual([68, 68.6, 69.5]);
  });

  test('ngày theo giờ máy của thời điểm UTC (kể cả chuỗi thiếu múi giờ)', () => {
    const entries = fromWeightHistoryDto(dto);
    const expectedLocalDate = (iso: string) => {
      const date = new Date(iso);
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    expect(entries[0].dateIso).toBe(expectedLocalDate('2026-09-27T03:00:00Z'));
    expect(entries[2].dateIso).toBe(expectedLocalDate('2026-09-06T03:00:00Z'));
  });

  test('chưa có điểm nào → rỗng', () => {
    expect(fromWeightHistoryDto({ ...dto, history: [] })).toEqual([]);
  });

  test('không làm thay đổi mảng gốc của BE', () => {
    const original = dto.history.map(point => point.id);

    fromWeightHistoryDto(dto);

    expect(dto.history.map(point => point.id)).toEqual(original);
  });
});

describe('toRecordedAtIso', () => {
  test('hôm nay → thời điểm hiện tại dạng ISO UTC có Z', () => {
    const now = new Date(2026, 9, 2, 8, 15, 30);

    expect(toRecordedAtIso('2026-10-02', now)).toBe(now.toISOString());
    expect(toRecordedAtIso('2026-10-02', now).endsWith('Z')).toBe(true);
  });

  test('ngày khác → 12:00 giờ máy của ngày đó (không bị lệch sang ngày kề do UTC)', () => {
    const iso = toRecordedAtIso('2026-09-20', new Date(2026, 9, 2));
    const recorded = new Date(iso);

    expect(iso.endsWith('Z')).toBe(true);
    expect([recorded.getFullYear(), recorded.getMonth(), recorded.getDate()]).toEqual([2026, 8, 20]);
    expect(recorded.getHours()).toBe(12);
  });
});

describe('snapshotFromInput', () => {
  const input: HealthProfileInput = {
    gender: 'female',
    dateOfBirth: new Date(1996, 5, 15),
    heightCm: 160,
    weightKg: 55,
    goalWeightKg: 52,
    activityLevel: 'moderate',
    goal: 'lose',
    allergyIds: ['peanut'],
    healthConditionIds: [],
    dietaryPreferenceIds: ['vegan'],
  };
  const result = {
    bmi: 21.5,
    bmr: 1283,
    tdee: 1988,
    calorieTarget: 1488,
    macros: { proteinG: 93, carbsG: 186, fatG: 41 },
    goal: 'lose' as const,
  };

  test('tuổi tính từ ngày sinh và giữ ngày sinh thật', () => {
    const snapshot = snapshotFromInput(input, result, TODAY);

    expect(snapshot.age).toBe(30);
    expect(snapshot.dateOfBirth).toBe(input.dateOfBirth);
    expect(snapshot).toMatchObject({
      gender: 'female',
      heightCm: 160,
      weightKg: 55,
      goalWeightKg: 52,
      activityLevel: 'moderate',
      goal: 'lose',
      allergyIds: ['peanut'],
      dietaryPreferenceIds: ['vegan'],
      result,
    });
  });
});
