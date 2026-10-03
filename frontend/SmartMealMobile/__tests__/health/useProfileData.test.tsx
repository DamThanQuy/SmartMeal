/**
 * useProfileData (docs/fetch-api/part1 §6.5, §9, §7.7): hook sửa hồ sơ sức khỏe đọc hồ sơ hiện tại từ
 * userProfileStore, gọi healthProfileService rồi nạp kết quả (số liệu do BE tính + phần "Khác" giữ
 * cục bộ) lại vào store và làm mới các query phụ thuộc mục tiêu calo. Service được mock.
 */
import {
  WEIGHT_HISTORY_QUERY_KEY,
  useRecordWeight,
  useUpdateBasicInfo,
  useUpdateHealthSettings,
  useWeightHistory,
} from '@/features/health/hooks/useProfileData';
import { healthProfileService } from '@/features/health/services/healthProfileService';
import type {
  HealthProfileExtras,
  HealthProfileSnapshot,
  HydratedHealthProfile,
} from '@/features/health/types/health.types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { renderHookWithQuery } from '../../test-utils/renderHookWithQuery';

jest.mock('@/features/health/services/healthProfileService', () => ({
  healthProfileService: {
    getWeightHistory: jest.fn(),
    recordWeight: jest.fn(),
    updateBasicInfo: jest.fn(),
    updateHealthSettings: jest.fn(),
  },
}));

const service = healthProfileService as jest.Mocked<typeof healthProfileService>;

const RESULT = {
  bmi: 21.1,
  bmr: 1262,
  tdee: 1956,
  calorieTarget: 1456,
  macros: { proteinG: 91, carbsG: 182, fatG: 40 },
  goal: 'lose' as const,
};

const LOCAL_EXTRAS: HealthProfileExtras = {
  localAllergyIds: ['other'],
  localHealthConditionIds: ['other'],
};

function profile(
  overrides: Partial<HealthProfileSnapshot> = {},
  extras: HealthProfileExtras = LOCAL_EXTRAS,
): HydratedHealthProfile {
  return {
    snapshot: {
      gender: 'female',
      age: 30,
      heightCm: 160,
      weightKg: 54,
      goalWeightKg: 52,
      activityLevel: 'moderate',
      goal: 'lose',
      allergyIds: ['peanut', 'treeNut'],
      healthConditionIds: [],
      dietaryPreferenceIds: ['keto'],
      result: RESULT,
      ...overrides,
    },
    extras,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useUserProfileStore.setState({
    gender: 'female',
    dateOfBirth: new Date(1996, 5, 15),
    heightCm: 160,
    weightKg: 55,
    goalWeightKg: 52,
    activityLevel: 'moderate',
    goal: 'lose',
    allergyIds: ['peanut', 'treeNut'],
    healthConditionIds: ['other'],
    dietaryPreferenceIds: ['keto'],
  });
});

describe('useRecordWeight', () => {
  test('gửi hồ sơ hiện tại cho service, nạp chỉ số mới vào store và giữ mục "Khác" ở máy', async () => {
    service.recordWeight.mockResolvedValue(profile());
    const hook = await renderHookWithQuery(() => useRecordWeight());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await hook.run(() => hook.current.mutateAsync({ weightKg: 54, dateIso: '2026-10-02' }));

    expect(service.recordWeight).toHaveBeenCalledWith(
      { weightKg: 54, dateIso: '2026-10-02' },
      expect.objectContaining({
        gender: 'female',
        heightCm: 160,
        weightKg: 55,
        goalWeightKg: 52,
        allergyIds: ['peanut', 'treeNut'],
        healthConditionIds: ['other'],
        dietaryPreferenceIds: ['keto'],
      }),
    );
    expect(useUserProfileStore.getState()).toMatchObject({
      weightKg: 54,
      result: RESULT,
      allergyIds: ['peanut', 'treeNut', 'other'],
      healthConditionIds: ['other'],
      dietaryPreferenceIds: ['keto'],
    });
    // Mục tiêu calo đổi → làm mới mọi nơi dùng nó.
    [WEIGHT_HISTORY_QUERY_KEY[0], 'diary', 'dashboard', 'progress', 'meal-plan'].forEach(key => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
    });
    await hook.unmount();
  });

  test('service lỗi → store giữ nguyên, mutation báo lỗi', async () => {
    const error = new Error('Không thể lưu cân nặng.');
    service.recordWeight.mockRejectedValue(error);
    const hook = await renderHookWithQuery(() => useRecordWeight());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await expect(
      hook.run(() => hook.current.mutateAsync({ weightKg: 54, dateIso: '2026-10-02' })),
    ).rejects.toBe(error);

    expect(useUserProfileStore.getState().weightKg).toBe(55);
    expect(invalidate).not.toHaveBeenCalled();
    expect(hook.current.error).toBe(error);
    await hook.unmount();
  });
});

describe('useUpdateBasicInfo', () => {
  test('nạp hồ sơ mới và dùng đúng ngày sinh BE đã lưu', async () => {
    const savedDob = new Date(1995, 2, 8);
    service.updateBasicInfo.mockResolvedValue(
      profile({ gender: 'male', heightCm: 175, age: 31, dateOfBirth: savedDob }),
    );
    const hook = await renderHookWithQuery(() => useUpdateBasicInfo());

    await hook.run(() =>
      hook.current.mutateAsync({ gender: 'male', dateOfBirth: savedDob, heightCm: 175 }),
    );

    expect(service.updateBasicInfo).toHaveBeenCalledWith(
      { gender: 'male', dateOfBirth: savedDob, heightCm: 175 },
      expect.objectContaining({ gender: 'female', heightCm: 160 }),
    );
    const state = useUserProfileStore.getState();
    expect(state).toMatchObject({ gender: 'male', heightCm: 175, result: RESULT });
    expect(state.dateOfBirth).toBe(savedDob);
    await hook.unmount();
  });
});

describe('useUpdateHealthSettings', () => {
  const selection = {
    allergyIds: ['seafood', 'sesame', 'other'],
    healthConditionIds: ['diabetes'],
    dietaryPreferenceIds: ['vegan'],
  };

  test('bản mock (service trả null) → chỉ áp lựa chọn vào store', async () => {
    service.updateHealthSettings.mockResolvedValue(null);
    const hook = await renderHookWithQuery(() => useUpdateHealthSettings());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await hook.run(() => hook.current.mutateAsync(selection));

    expect(service.updateHealthSettings).toHaveBeenCalledWith(
      selection,
      expect.objectContaining({ allergyIds: ['peanut', 'treeNut'] }),
    );
    expect(useUserProfileStore.getState()).toMatchObject({
      allergyIds: ['seafood', 'sesame', 'other'],
      healthConditionIds: ['diabetes'],
      dietaryPreferenceIds: ['vegan'],
      // Chỉ số không đổi.
      weightKg: 55,
    });
    // Dị ứng/bệnh lý ảnh hưởng gợi ý ở nhiều feature → làm mới mọi query đang hiển thị.
    expect(invalidate).toHaveBeenCalledWith();
    await hook.unmount();
  });

  test('BE trả hồ sơ mới → nạp lại, ghép với mục "Khác" giữ ở máy', async () => {
    service.updateHealthSettings.mockResolvedValue(
      profile({
        allergyIds: ['seafood', 'sesame'],
        healthConditionIds: ['diabetes'],
        dietaryPreferenceIds: ['vegan'],
      }),
    );
    const hook = await renderHookWithQuery(() => useUpdateHealthSettings());

    await hook.run(() => hook.current.mutateAsync(selection));

    expect(useUserProfileStore.getState()).toMatchObject({
      allergyIds: ['seafood', 'sesame', 'other'],
      healthConditionIds: ['diabetes', 'other'],
      dietaryPreferenceIds: ['vegan'],
      result: RESULT,
    });
    await hook.unmount();
  });

  test('service lỗi → store giữ nguyên lựa chọn cũ', async () => {
    service.updateHealthSettings.mockRejectedValue(new Error('Máy chủ gặp sự cố.'));
    const hook = await renderHookWithQuery(() => useUpdateHealthSettings());

    await expect(hook.run(() => hook.current.mutateAsync(selection))).rejects.toThrow(
      'Máy chủ gặp sự cố.',
    );

    expect(useUserProfileStore.getState().allergyIds).toEqual(['peanut', 'treeNut']);
    await hook.unmount();
  });
});

describe('useWeightHistory', () => {
  test('lấy lịch sử cân nặng từ service (key weight-history)', async () => {
    const history = [{ id: 'w1', dateIso: '2026-09-27', weightKg: 68 }];
    service.getWeightHistory.mockResolvedValue(history);
    const hook = await renderHookWithQuery(() => useWeightHistory());

    await hook.flush();

    expect(hook.current.data).toEqual(history);
    expect(hook.queryClient.getQueryData(WEIGHT_HISTORY_QUERY_KEY)).toEqual(history);
    await hook.unmount();
  });
});
