/**
 * useProfileData (docs/fetch-api/part1 §6.5, §9, §7.7): hook sửa hồ sơ sức khỏe đọc hồ sơ hiện tại từ
 * userProfileStore, gọi healthProfileService rồi nạp kết quả (số liệu do BE tính) lại vào store và
 * làm mới các query phụ thuộc mục tiêu calo. Service được mock.
 */
import {
  WEIGHT_HISTORY_QUERY_KEY,
  useRecordWeight,
  useUpdateBasicInfo,
  useUpdateHealthSettings,
  useWeightHistory,
} from '@/features/health/hooks/useProfileData';
import { healthProfileService } from '@/features/health/services/healthProfileService';
import type { HealthProfileSnapshot } from '@/features/health/types/health.types';
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

function snapshot(overrides: Partial<HealthProfileSnapshot> = {}): HealthProfileSnapshot {
  return {
    gender: 'female',
    age: 30,
    heightCm: 160,
    weightKg: 54,
    goalWeightKg: 52,
    activityLevel: 'moderate',
    goal: 'lose',
    allergyIds: ['peanut'],
    healthConditionIds: [],
    result: RESULT,
    ...overrides,
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
  test('gửi hồ sơ hiện tại cho service, nạp chỉ số mới vào store và giữ phần chỉ có ở máy', async () => {
    service.recordWeight.mockResolvedValue(snapshot());
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
      }),
    );
    expect(useUserProfileStore.getState()).toMatchObject({
      weightKg: 54,
      result: RESULT,
      // Mục "treeNut"/"other" không có trên BE nên không bị mất sau khi nạp lại.
      allergyIds: ['peanut', 'treeNut'],
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
  test('nạp hồ sơ mới và dùng đúng ngày sinh người dùng vừa nhập (BE chỉ lưu tuổi)', async () => {
    const typedDob = new Date(1995, 2, 8);
    service.updateBasicInfo.mockResolvedValue(
      snapshot({ gender: 'male', heightCm: 175, age: 31, dateOfBirth: typedDob }),
    );
    const hook = await renderHookWithQuery(() => useUpdateBasicInfo());

    await hook.run(() => hook.current.mutateAsync({ gender: 'male', dateOfBirth: typedDob, heightCm: 175 }));

    expect(service.updateBasicInfo).toHaveBeenCalledWith(
      { gender: 'male', dateOfBirth: typedDob, heightCm: 175 },
      expect.objectContaining({ gender: 'female', heightCm: 160 }),
    );
    const state = useUserProfileStore.getState();
    expect(state).toMatchObject({ gender: 'male', heightCm: 175, result: RESULT });
    expect(state.dateOfBirth).toBe(typedDob);
    await hook.unmount();
  });
});

describe('useUpdateHealthSettings', () => {
  const selection = {
    allergyIds: ['seafood', 'sesame'],
    healthConditionIds: ['diabetes'],
    dietaryPreferenceIds: ['vegan'],
  };

  test('BE không đổi gì (service trả null) → chỉ áp lựa chọn vào store', async () => {
    service.updateHealthSettings.mockResolvedValue(null);
    const hook = await renderHookWithQuery(() => useUpdateHealthSettings());
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    await hook.run(() => hook.current.mutateAsync(selection));

    expect(service.updateHealthSettings).toHaveBeenCalledWith(
      selection,
      expect.objectContaining({ allergyIds: ['peanut', 'treeNut'] }),
    );
    expect(useUserProfileStore.getState()).toMatchObject({
      allergyIds: ['seafood', 'sesame'],
      healthConditionIds: ['diabetes'],
      dietaryPreferenceIds: ['vegan'],
      // Chỉ số không đổi.
      weightKg: 55,
    });
    // Dị ứng/bệnh lý ảnh hưởng gợi ý ở nhiều feature → làm mới mọi query đang hiển thị.
    expect(invalidate).toHaveBeenCalledWith();
    await hook.unmount();
  });

  test('BE đã ghi đè hồ sơ (service trả snapshot) → nạp lại, ghép với phần chỉ có ở máy', async () => {
    service.updateHealthSettings.mockResolvedValue(
      snapshot({ allergyIds: ['seafood'], healthConditionIds: ['diabetes'] }),
    );
    const hook = await renderHookWithQuery(() => useUpdateHealthSettings());

    await hook.run(() => hook.current.mutateAsync(selection));

    expect(useUserProfileStore.getState()).toMatchObject({
      allergyIds: ['seafood', 'sesame'],
      healthConditionIds: ['diabetes'],
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
