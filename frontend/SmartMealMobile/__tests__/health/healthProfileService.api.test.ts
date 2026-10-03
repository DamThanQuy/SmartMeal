/**
 * healthProfileService.api (docs/fetch-api/part1 §6): gọi đúng endpoint BE, quy đổi request/
 * response theo mã danh mục (code) và giữ lại phần "Khác" mà BE không có. `api` và danh mục /meta
 * được mock — không gọi mạng thật.
 */
import { format } from 'date-fns';
import type { MetaCatalog } from '@/features/health/services/metaLookup';
import type { HealthProfileDto } from '@/features/health/types/health.api.types';
import type { AuthUser } from '@/state/auth/authStore';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileFormData,
  type HealthProfileInput,
} from '@/features/health/types/health.types';
import { createTestCatalog } from '../../test-utils/metaCatalog';

const PROFILE_DTO: HealthProfileDto = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  gender: 'Female',
  age: 30,
  dateOfBirth: '1996-01-01',
  heightCm: 160,
  currentWeightKg: 55,
  targetWeightKg: 52,
  activityLevel: 'Moderate',
  goal: 'LoseWeight',
  waterGoalMl: 2000,
  bmi: 21.5,
  bmiClassification: 'Bình thường (Normal)',
  bmr: 1282.5,
  tdee: 1987.875,
  dailyCaloriesTarget: 1488,
  dailyCarbsTargetGrams: 186,
  dailyFatTargetGrams: 41.3,
  dailyProteinTargetGrams: 93,
  allergyIds: [2, 8],
  medicalConditionIds: [],
  dietaryPreferenceIds: [3],
};

const PENDING_USER: AuthUser = {
  id: 'user-9',
  fullName: 'A',
  email: 'a@x.vn',
  avatarUrl: null,
  isPro: false,
  role: 'User',
  hasCompletedSurvey: false,
};

function createForm(): HealthProfileFormData {
  return {
    ...createEmptyHealthProfileFormData(),
    dateOfBirth: { day: '1', month: '6', year: '1990' },
    gender: 'female',
    heightCm: '160',
    weightKg: '55',
    goal: 'lose',
    goalWeightKg: '52',
    activityLevel: 'moderate',
    allergyIds: ['peanut', 'sesame', 'other'],
    healthConditionIds: [],
    dietaryPreferenceIds: ['vegan'],
  };
}

let catalog: MetaCatalog;

beforeAll(async () => {
  catalog = await createTestCatalog();
});

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn(), put: jest.fn() };
  const extrasStorage = { save: jest.fn().mockResolvedValue(undefined), load: jest.fn() };
  extrasStorage.load.mockResolvedValue({ localAllergyIds: [], localHealthConditionIds: [] });

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
  }));
  jest.doMock('@/features/health/services/metaCatalog', () => ({
    getMetaCatalog: jest.fn(async () => catalog),
  }));
  jest.doMock('@/features/health/services/profileExtrasStorage', () => ({
    profileExtrasStorage: extrasStorage,
    EMPTY_PROFILE_EXTRAS: { localAllergyIds: [], localHealthConditionIds: [] },
  }));

  const { healthProfileApiService } =
    require('@/features/health/services/healthProfileService.api') as typeof import('@/features/health/services/healthProfileService.api');
  const { useAuthStore } =
    require('@/state/auth/authStore') as typeof import('@/state/auth/authStore');
  // Cùng registry với isApiError của service để instanceof đúng sau jest.resetModules().
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');
  return { service: healthProfileApiService, apiMock, extrasStorage, useAuthStore, ApiError };
}

describe('submitHealthProfile', () => {
  test('POST /healthprofile/survey với NGÀY SINH, dị ứng và chế độ ăn theo id BE; trả kết quả do BE tính', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(PROFILE_DTO);

    const result = await service.submitHealthProfile?.(createForm());

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [url, body] = apiMock.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/healthprofile/survey');
    expect(body).toEqual({
      gender: 'Female',
      dateOfBirth: '1990-06-01',
      heightCm: 160,
      currentWeightKg: 55,
      targetWeightKg: 52,
      activityLevel: 'Moderate',
      goal: 'LoseWeight',
      allergyIds: [2, 8], // peanut, sesame; "other" không có trên BE
      medicalConditionIds: [],
      dietaryPreferenceIds: [3], // vegan
    });
    expect(result).toEqual({
      bmi: 21.5,
      bmr: 1283,
      tdee: 1988,
      calorieTarget: 1488,
      macros: { proteinG: 93, carbsG: 186, fatG: 41 },
      goal: 'lose',
    });
  });

  test('chỉ lưu cục bộ lựa chọn "Khác" cho user hiện tại (cả user đang onboarding)', async () => {
    const { service, apiMock, extrasStorage, useAuthStore } = loadService();
    apiMock.post.mockResolvedValue(PROFILE_DTO);
    useAuthStore.setState({ pendingUser: PENDING_USER });

    await service.submitHealthProfile?.(createForm());

    expect(extrasStorage.save).toHaveBeenCalledWith('user-9', {
      localAllergyIds: ['other'],
      localHealthConditionIds: [],
    });
  });

  test('chưa biết user (mock/Guest) → không lưu phần cục bộ nhưng vẫn trả kết quả', async () => {
    const { service, apiMock, extrasStorage } = loadService();
    apiMock.post.mockResolvedValue(PROFILE_DTO);

    await expect(service.submitHealthProfile?.(createForm())).resolves.toBeDefined();
    expect(extrasStorage.save).not.toHaveBeenCalled();
  });

  test('BE báo lỗi → ném ApiError và KHÔNG lưu phần cục bộ', async () => {
    const { service, apiMock, extrasStorage, useAuthStore, ApiError } = loadService();
    apiMock.post.mockRejectedValue(new ApiError('Tuổi phải từ 13 đến 100.', 'BUSINESS', 400));
    useAuthStore.setState({ pendingUser: PENDING_USER });

    await expect(service.submitHealthProfile?.(createForm())).rejects.toMatchObject({
      code: 'BUSINESS',
    });
    expect(extrasStorage.save).not.toHaveBeenCalled();
  });
});

describe('getHealthProfile', () => {
  test('GET /healthprofile → snapshot theo code + phần "Khác" cục bộ của đúng user', async () => {
    const { service, apiMock, extrasStorage } = loadService();
    apiMock.get.mockResolvedValue(PROFILE_DTO);
    extrasStorage.load.mockResolvedValue({ localAllergyIds: ['other'], localHealthConditionIds: [] });

    const hydrated = await service.getHealthProfile?.('user-9');

    expect(apiMock.get).toHaveBeenCalledWith('/healthprofile');
    expect(hydrated?.snapshot).toMatchObject({
      gender: 'female',
      age: 30,
      dateOfBirth: new Date(1996, 0, 1),
      weightKg: 55,
      goalWeightKg: 52,
      activityLevel: 'moderate',
      goal: 'lose',
      allergyIds: ['peanut', 'sesame'],
      healthConditionIds: [],
      dietaryPreferenceIds: ['vegan'],
      waterGoalMl: 2000,
    });
    expect(hydrated?.extras.localAllergyIds).toEqual(['other']);
  });

  test('BE trả 404 (chưa khảo sát) → null', async () => {
    const { service, apiMock, ApiError } = loadService();
    apiMock.get.mockRejectedValue(new ApiError('Chưa hoàn thành khảo sát.', 'NOT_FOUND', 404));

    await expect(service.getHealthProfile?.('user-9')).resolves.toBeNull();
  });

  test.each([
    ['mất mạng', 'NETWORK', null],
    ['lỗi máy chủ', 'SERVER', 500],
    ['phiên hết hạn', 'UNAUTHORIZED', 401],
  ] as const)('%s → ném lại lỗi, không coi là "chưa khảo sát"', async (_label, code, status) => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Lỗi từ máy chủ.', code, status);
    apiMock.get.mockRejectedValue(error);

    await expect(service.getHealthProfile?.('user-9')).rejects.toBe(error);
  });
});

const CURRENT_PROFILE: HealthProfileInput = {
  gender: 'female',
  dateOfBirth: new Date(1996, 0, 1),
  heightCm: 160,
  weightKg: 55,
  goalWeightKg: 52,
  activityLevel: 'moderate',
  goal: 'lose',
  allergyIds: ['peanut', 'sesame'],
  healthConditionIds: [],
  dietaryPreferenceIds: ['vegan'],
};

describe('getWeightHistory', () => {
  test('GET /healthprofile/weight-history → mới → cũ', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue({
      currentWeightKg: 55,
      targetWeightKg: 52,
      initialWeightKg: 57,
      totalWeightChangedKg: -2,
      bmi: 21.5,
      bmiCategory: 'Bình thường',
      history: [
        { id: 'w1', weightKg: 57, recordedAt: '2026-09-06T03:00:00Z', diffFromTargetKg: 5 },
        { id: 'w2', weightKg: 55, recordedAt: '2026-09-27T03:00:00Z', diffFromTargetKg: 3 },
      ],
    });

    const history = await service.getWeightHistory?.();

    expect(apiMock.get).toHaveBeenCalledWith('/healthprofile/weight-history');
    expect(history?.map(entry => entry.id)).toEqual(['w2', 'w1']);
  });
});

describe('recordWeight', () => {
  test('POST /healthprofile/weight-log (recordedAt ISO có Z) RỒI GET /healthprofile lấy chỉ số mới', async () => {
    const { service, apiMock } = loadService();
    const order: string[] = [];
    apiMock.post.mockImplementation(async () => {
      order.push('post');
      return { id: 'w9', weightKg: 54, recordedAt: '2026-10-02T03:00:00Z', diffFromTargetKg: 2 };
    });
    apiMock.get.mockImplementation(async () => {
      order.push('get');
      return { ...PROFILE_DTO, currentWeightKg: 54, bmi: 21.1, dailyCaloriesTarget: 1470 };
    });
    const dateIso = format(new Date(), 'yyyy-MM-dd');

    const profile = await service.recordWeight?.({ weightKg: 54, dateIso }, CURRENT_PROFILE);

    expect(order).toEqual(['post', 'get']);
    const [url, body] = apiMock.post.mock.calls[0] as [string, { weightKg: number; recordedAt: string }];
    expect(url).toBe('/healthprofile/weight-log');
    expect(body.weightKg).toBe(54);
    expect(body.recordedAt.endsWith('Z')).toBe(true);
    expect(apiMock.get).toHaveBeenCalledWith('/healthprofile');
    expect(profile?.snapshot).toMatchObject({ weightKg: 54 });
    expect(profile?.snapshot.result.calorieTarget).toBe(1470);
  });

  test('ghi cân nặng lỗi → ném lỗi và không đọc lại hồ sơ', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Vui lòng hoàn thành khảo sát trước.', 'BUSINESS', 400);
    apiMock.post.mockRejectedValue(error);

    await expect(
      service.recordWeight?.({ weightKg: 54, dateIso: '2026-09-20' }, CURRENT_PROFILE),
    ).rejects.toBe(error);
    expect(apiMock.get).not.toHaveBeenCalled();
  });
});

describe('updateBasicInfo', () => {
  test('PUT /healthprofile chỉ với giới tính, ngày sinh, chiều cao — không ghi đè cả hồ sơ', async () => {
    const { service, apiMock } = loadService();
    apiMock.put.mockResolvedValue({
      ...PROFILE_DTO,
      gender: 'Male',
      heightCm: 175,
      age: 31,
      dateOfBirth: '1995-03-08',
    });

    const profile = await service.updateBasicInfo?.(
      { gender: 'male', dateOfBirth: new Date(1995, 2, 8), heightCm: 175 },
      CURRENT_PROFILE,
    );

    expect(apiMock.put).toHaveBeenCalledTimes(1);
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(apiMock.put).toHaveBeenCalledWith('/healthprofile', {
      gender: 'Male',
      dateOfBirth: '1995-03-08',
      heightCm: 175,
    });
    expect(profile?.snapshot).toMatchObject({
      gender: 'male',
      heightCm: 175,
      dateOfBirth: new Date(1995, 2, 8), // ngày sinh thật do BE lưu, không phải ước lượng
    });
  });

  test('BE từ chối (vd. ngày sinh vô lý) → ném lỗi của BE', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Tuổi phải từ 13 đến 100.', 'BUSINESS', 400);
    apiMock.put.mockRejectedValue(error);

    await expect(
      service.updateBasicInfo?.(
        { gender: 'male', dateOfBirth: new Date(2020, 0, 1), heightCm: 175 },
        CURRENT_PROFILE,
      ),
    ).rejects.toBe(error);
  });
});

describe('updateHealthSettings', () => {
  test('PUT /healthprofile với dị ứng/bệnh lý/chế độ ăn theo id BE rồi lưu phần "Khác" ở máy', async () => {
    const { service, apiMock, extrasStorage, useAuthStore } = loadService();
    useAuthStore.setState({ pendingUser: PENDING_USER });
    apiMock.put.mockResolvedValue({
      ...PROFILE_DTO,
      allergyIds: [1, 7],
      medicalConditionIds: [1],
      dietaryPreferenceIds: [2],
    });

    const profile = await service.updateHealthSettings?.(
      {
        allergyIds: ['seafood', 'treeNut', 'other'],
        healthConditionIds: ['diabetes'],
        dietaryPreferenceIds: ['keto'],
      },
      CURRENT_PROFILE,
    );

    expect(apiMock.put).toHaveBeenCalledWith('/healthprofile', {
      allergyIds: [1, 7],
      medicalConditionIds: [1],
      dietaryPreferenceIds: [2],
    });
    expect(apiMock.post).not.toHaveBeenCalled(); // không còn ghi đè hồ sơ bằng /survey (và không thêm dòng cân nặng)
    expect(extrasStorage.save).toHaveBeenCalledWith('user-9', {
      localAllergyIds: ['other'],
      localHealthConditionIds: [],
    });
    expect(profile?.snapshot).toMatchObject({
      allergyIds: ['seafood', 'treeNut'],
      healthConditionIds: ['diabetes'],
      dietaryPreferenceIds: ['keto'],
    });
    expect(profile?.extras.localAllergyIds).toEqual(['other']);
  });

  test('chỉ đổi chế độ ăn vẫn gọi BE (chế độ ăn nay do BE lưu)', async () => {
    const { service, apiMock } = loadService();
    apiMock.put.mockResolvedValue({ ...PROFILE_DTO, dietaryPreferenceIds: [2, 7] });

    await service.updateHealthSettings?.(
      { allergyIds: ['peanut', 'sesame'], healthConditionIds: [], dietaryPreferenceIds: ['keto', 'lowCarb'] },
      CURRENT_PROFILE,
    );

    expect(apiMock.put).toHaveBeenCalledTimes(1);
    expect(apiMock.put.mock.calls[0][1]).toMatchObject({ dietaryPreferenceIds: [2, 7] });
  });

  test('chọn "Không có" gửi danh sách rỗng để BE xóa dữ liệu cũ', async () => {
    const { service, apiMock } = loadService();
    apiMock.put.mockResolvedValue({ ...PROFILE_DTO, allergyIds: [], dietaryPreferenceIds: [] });

    await service.updateHealthSettings?.(
      { allergyIds: [], healthConditionIds: [], dietaryPreferenceIds: [] },
      CURRENT_PROFILE,
    );

    expect(apiMock.put).toHaveBeenCalledWith('/healthprofile', {
      allergyIds: [],
      medicalConditionIds: [],
      dietaryPreferenceIds: [],
    });
  });

  test('BE báo lỗi → ném lỗi và KHÔNG lưu phần ở máy', async () => {
    const { service, apiMock, extrasStorage, useAuthStore, ApiError } = loadService();
    useAuthStore.setState({ pendingUser: PENDING_USER });
    const error = new ApiError('Máy chủ gặp sự cố.', 'SERVER', 500);
    apiMock.put.mockRejectedValue(error);

    await expect(
      service.updateHealthSettings?.(
        { allergyIds: ['seafood'], healthConditionIds: [], dietaryPreferenceIds: [] },
        CURRENT_PROFILE,
      ),
    ).rejects.toBe(error);
    expect(extrasStorage.save).not.toHaveBeenCalled();
  });
});

describe('updateWaterGoal', () => {
  test('PUT /healthprofile chỉ với waterGoalMl; trả hồ sơ mới có mục tiêu nước do BE lưu', async () => {
    const { service, apiMock } = loadService();
    apiMock.put.mockResolvedValue({ ...PROFILE_DTO, waterGoalMl: 2400 });

    const profile = await service.updateWaterGoal?.(2400);

    expect(apiMock.put).toHaveBeenCalledTimes(1);
    expect(apiMock.put).toHaveBeenCalledWith('/healthprofile', { waterGoalMl: 2400 });
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(profile?.snapshot.waterGoalMl).toBe(2400);
  });

  test('BE từ chối (ngoài 500–10000 ml) → ném lỗi của BE', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Mục tiêu nước uống phải từ 500 đến 10000 ml.', 'BUSINESS', 400);
    apiMock.put.mockRejectedValue(error);

    await expect(service.updateWaterGoal?.(50)).rejects.toBe(error);
  });
});
