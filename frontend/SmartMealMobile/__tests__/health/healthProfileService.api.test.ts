/**
 * healthProfileService.api (docs/fetch-api/part1 §6): gọi đúng endpoint BE, quy đổi request/
 * response và giữ phần hồ sơ BE không lưu. `api` được mock — không gọi mạng thật.
 */
import type { HealthProfileDto } from '@/features/health/types/health.api.types';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileFormData,
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
    useAuthStore.setState({ pendingUser: { id: 'user-9', fullName: 'A', email: 'a@x.vn' } });

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
    apiMock.post.mockRejectedValue(new ApiError('Dữ liệu gửi lên không hợp lệ.', 'VALIDATION', 400));
    useAuthStore.setState({ pendingUser: { id: 'user-9', fullName: 'A', email: 'a@x.vn' } });

    await expect(service.submitHealthProfile?.(createForm())).rejects.toMatchObject({
      code: 'VALIDATION',
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
