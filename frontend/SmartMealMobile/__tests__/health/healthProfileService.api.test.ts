/**
 * healthProfileService.api (docs/fetch-api/part1 §6): gọi đúng endpoint BE, quy đổi request/
 * response và giữ phần hồ sơ BE không lưu. `api` được mock — không gọi mạng thật.
 */
import { format } from 'date-fns';
import { calculateAge } from '@/features/health/services/healthCalculator';
import type { HealthProfileDto } from '@/features/health/types/health.api.types';
import type { AuthUser } from '@/state/auth/authStore';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileFormData,
  type HealthProfileInput,
} from '@/features/health/types/health.types';

const PROFILE_DTO: HealthProfileDto = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  gender: 'Female',
  age: 30,
  heightCm: 160,
  currentWeightKg: 55,
  targetWeightKg: 52,
  activityLevel: 'Moderate',
  goal: 'LoseWeight',
  bmi: 21.5,
  bmiClassification: 'Bình thường (Normal)',
  bmr: 1282.5,
  tdee: 1987.875,
  dailyCaloriesTarget: 1488,
  dailyCarbsTargetGrams: 186,
  dailyFatTargetGrams: 41.3,
  dailyProteinTargetGrams: 93,
  allergies: ['Đậu phộng (Peanuts)'],
  medicalConditions: [],
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
    allergyIds: ['peanut', 'sesame'],
    healthConditionIds: [],
    dietaryPreferenceIds: ['vegan'],
  };
}

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };
  const extrasStorage = { save: jest.fn().mockResolvedValue(undefined), load: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
  }));
  jest.doMock('@/features/health/services/profileExtrasStorage', () => ({
    profileExtrasStorage: extrasStorage,
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
  test('POST /healthprofile/survey với request đã quy đổi, trả kết quả do BE tính', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(PROFILE_DTO);

    const result = await service.submitHealthProfile?.(createForm());

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [url, body] = apiMock.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/healthprofile/survey');
    expect(body).toMatchObject({
      gender: 'Female',
      heightCm: 160,
      currentWeightKg: 55,
      targetWeightKg: 52,
      activityLevel: 'Moderate',
      goal: 'LoseWeight',
      allergyIds: [2],
      medicalConditionIds: [],
    });
    expect(typeof body.age).toBe('number');
    expect(result).toEqual({
      bmi: 21.5,
      bmr: 1283,
      tdee: 1988,
      calorieTarget: 1488,
      macros: { proteinG: 93, carbsG: 186, fatG: 41 },
      goal: 'lose',
    });
  });

  test('lưu phần hồ sơ BE không lưu cho user hiện tại (cả user đang onboarding)', async () => {
    const { service, apiMock, extrasStorage, useAuthStore } = loadService();
    apiMock.post.mockResolvedValue(PROFILE_DTO);
    useAuthStore.setState({ pendingUser: PENDING_USER });

    await service.submitHealthProfile?.(createForm());

    expect(extrasStorage.save).toHaveBeenCalledWith('user-9', {
      dietaryPreferenceIds: ['vegan'],
      localAllergyIds: ['sesame'],
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
    apiMock.post.mockRejectedValue(new ApiError('Dữ liệu gửi lên không hợp lệ.', 'BUSINESS', 400));
    useAuthStore.setState({ pendingUser: PENDING_USER });

    await expect(service.submitHealthProfile?.(createForm())).rejects.toMatchObject({
      code: 'BUSINESS',
    });
    expect(extrasStorage.save).not.toHaveBeenCalled();
  });
});

describe('getHealthProfile', () => {
  test('GET /healthprofile → snapshot + phần hồ sơ cục bộ của đúng user', async () => {
    const { service, apiMock, extrasStorage } = loadService();
    apiMock.get.mockResolvedValue(PROFILE_DTO);
    extrasStorage.load.mockResolvedValue({
      dietaryPreferenceIds: ['vegan'],
      localAllergyIds: ['sesame'],
      localHealthConditionIds: [],
    });

    const hydrated = await service.getHealthProfile?.('user-9');

    expect(apiMock.get).toHaveBeenCalledWith('/healthprofile');
    expect(extrasStorage.load).toHaveBeenCalledWith('user-9');
    expect(hydrated?.snapshot).toMatchObject({
      gender: 'female',
      age: 30,
      weightKg: 55,
      goalWeightKg: 52,
      activityLevel: 'moderate',
      goal: 'lose',
      allergyIds: ['peanut'],
      healthConditionIds: [],
    });
    expect(hydrated?.extras.localAllergyIds).toEqual(['sesame']);
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

    const snapshot = await service.recordWeight?.({ weightKg: 54, dateIso }, CURRENT_PROFILE);

    expect(order).toEqual(['post', 'get']);
    const [url, body] = apiMock.post.mock.calls[0] as [string, { weightKg: number; recordedAt: string }];
    expect(url).toBe('/healthprofile/weight-log');
    expect(body.weightKg).toBe(54);
    expect(body.recordedAt.endsWith('Z')).toBe(true);
    expect(apiMock.get).toHaveBeenCalledWith('/healthprofile');
    expect(snapshot).toMatchObject({ weightKg: 54 });
    expect(snapshot?.result.calorieTarget).toBe(1470);
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
  test('POST /healthprofile/survey với hồ sơ hiện tại + phần đổi, giữ ngày sinh vừa nhập', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ ...PROFILE_DTO, gender: 'Male', heightCm: 175, age: 31 });
    const dateOfBirth = new Date(1995, 2, 8);

    const snapshot = await service.updateBasicInfo?.(
      { gender: 'male', dateOfBirth, heightCm: 175 },
      CURRENT_PROFILE,
    );

    const [url, body] = apiMock.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/healthprofile/survey');
    expect(body).toMatchObject({
      gender: 'Male',
      heightCm: 175,
      currentWeightKg: 55,
      targetWeightKg: 52,
      activityLevel: 'Moderate',
      goal: 'LoseWeight',
      allergyIds: [2],
    });
    expect(body.age).toBe(calculateAge(dateOfBirth));
    expect(snapshot).toMatchObject({ gender: 'male', heightCm: 175 });
    expect(snapshot?.dateOfBirth).toBe(dateOfBirth);
  });
});

describe('updateHealthSettings', () => {
  test('chỉ đổi chế độ ăn hoặc mục không có id → KHÔNG ghi đè hồ sơ trên BE, chỉ lưu phần ở máy', async () => {
    const { service, apiMock, extrasStorage, useAuthStore } = loadService();
    useAuthStore.setState({ pendingUser: PENDING_USER });

    const snapshot = await service.updateHealthSettings?.(
      {
        allergyIds: ['peanut', 'treeNut'],
        healthConditionIds: ['other'],
        dietaryPreferenceIds: ['keto'],
      },
      CURRENT_PROFILE,
    );

    expect(snapshot).toBeNull();
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(extrasStorage.save).toHaveBeenCalledWith('user-9', {
      dietaryPreferenceIds: ['keto'],
      localAllergyIds: ['treeNut'],
      localHealthConditionIds: ['other'],
    });
  });

  test('đổi dị ứng/bệnh lý có id → POST /healthprofile/survey rồi lưu phần ở máy', async () => {
    const { service, apiMock, extrasStorage, useAuthStore } = loadService();
    useAuthStore.setState({ pendingUser: PENDING_USER });
    apiMock.post.mockResolvedValue({
      ...PROFILE_DTO,
      allergies: ['Hải sản (Seafood)'],
      medicalConditions: ['Tiểu đường (Diabetes)'],
    });

    const snapshot = await service.updateHealthSettings?.(
      {
        allergyIds: ['seafood', 'sesame'],
        healthConditionIds: ['diabetes'],
        dietaryPreferenceIds: [],
      },
      CURRENT_PROFILE,
    );

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      allergyIds: [1],
      medicalConditionIds: [1],
    });
    expect(extrasStorage.save).toHaveBeenCalledWith('user-9', {
      dietaryPreferenceIds: [],
      localAllergyIds: ['sesame'],
      localHealthConditionIds: [],
    });
    expect(snapshot).toMatchObject({ allergyIds: ['seafood'], healthConditionIds: ['diabetes'] });
  });

  test('BE báo lỗi → ném lỗi và KHÔNG lưu phần ở máy', async () => {
    const { service, apiMock, extrasStorage, useAuthStore, ApiError } = loadService();
    useAuthStore.setState({ pendingUser: PENDING_USER });
    const error = new ApiError('Máy chủ gặp sự cố.', 'SERVER', 500);
    apiMock.post.mockRejectedValue(error);

    await expect(
      service.updateHealthSettings?.(
        { allergyIds: ['seafood'], healthConditionIds: [], dietaryPreferenceIds: [] },
        CURRENT_PROFILE,
      ),
    ).rejects.toBe(error);
    expect(extrasStorage.save).not.toHaveBeenCalled();
  });
});
