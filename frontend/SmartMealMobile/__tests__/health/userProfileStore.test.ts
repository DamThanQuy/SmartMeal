/**
 * userProfileStore (docs/fetch-api/part1 §6.5): chạy mock → hồ sơ mẫu; gọi API thật → bắt đầu
 * rỗng rồi được nạp bằng hydrateFromServer (store là bản sao đồng bộ của hồ sơ trên server).
 */
import type {
  HealthProfileExtras,
  HealthProfileSnapshot,
} from '@/features/health/types/health.types';

function loadStore(useMockApi: boolean) {
  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  const { useUserProfileStore } =
    require('@/state/user/userProfileStore') as typeof import('@/state/user/userProfileStore');
  // resetUserData phải lấy registry của đúng lần nạp module này.
  const { resetUserData: reset } =
    require('@/state/resetUserData') as typeof import('@/state/resetUserData');
  return { useUserProfileStore, resetUserData: reset };
}

const SNAPSHOT: HealthProfileSnapshot = {
  gender: 'female',
  age: 30,
  heightCm: 160,
  weightKg: 55,
  goalWeightKg: 52,
  activityLevel: 'moderate',
  goal: 'lose',
  allergyIds: ['peanut', 'sesame'],
  healthConditionIds: ['diabetes'],
  dietaryPreferenceIds: ['vegan'],
  result: {
    bmi: 21.5,
    bmr: 1283,
    tdee: 1988,
    calorieTarget: 1488,
    macros: { proteinG: 93, carbsG: 186, fatG: 41 },
    goal: 'lose',
  },
};

// Chỉ còn lựa chọn "Khác" giữ cục bộ; dị ứng, bệnh lý và chế độ ăn do BE lưu.
const EXTRAS: HealthProfileExtras = {
  localAllergyIds: ['other'],
  localHealthConditionIds: ['other'],
};

describe('trạng thái ban đầu', () => {
  test('chạy mock → hồ sơ mẫu của design', () => {
    const { useUserProfileStore } = loadStore(true);

    const state = useUserProfileStore.getState();

    expect(state.weightKg).toBe(68);
    expect(state.allergyIds).toEqual(['dairy', 'peanut']);
  });

  test('gọi API thật → rỗng, không hiện số liệu giả', () => {
    const { useUserProfileStore } = loadStore(false);

    const state = useUserProfileStore.getState();

    expect(state.weightKg).toBe(0);
    expect(state.heightCm).toBe(0);
    expect(state.allergyIds).toEqual([]);
    expect(state.healthConditionIds).toEqual([]);
    expect(state.dietaryPreferenceIds).toEqual([]);
    expect(state.result.calorieTarget).toBe(0);
    expect(Number.isNaN(state.dateOfBirth.getTime())).toBe(false);
  });
});

describe('hydrateFromServer', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 2) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('đổ hồ sơ từ BE vào store, ghép với phần giữ cục bộ', () => {
    const { useUserProfileStore } = loadStore(false);

    useUserProfileStore.getState().hydrateFromServer(SNAPSHOT, EXTRAS);

    expect(useUserProfileStore.getState()).toMatchObject({
      gender: 'female',
      heightCm: 160,
      weightKg: 55,
      goalWeightKg: 52,
      activityLevel: 'moderate',
      goal: 'lose',
      allergyIds: ['peanut', 'sesame', 'other'],
      healthConditionIds: ['diabetes', 'other'],
      dietaryPreferenceIds: ['vegan'],
      result: SNAPSHOT.result,
    });
  });

  test('mục tiêu nước của BE được nạp; không có thì giữ giá trị đang dùng', () => {
    const { useUserProfileStore } = loadStore(false);
    const hydrate = useUserProfileStore.getState().hydrateFromServer;

    hydrate({ ...SNAPSHOT, waterGoalMl: 2400 }, EXTRAS);
    expect(useUserProfileStore.getState().waterGoalMl).toBe(2400);

    hydrate(SNAPSHOT, EXTRAS); // snapshot không có waterGoalMl (vd. mock)
    expect(useUserProfileStore.getState().waterGoalMl).toBe(2400);
  });

  test('hồ sơ cũ BE chưa có ngày sinh → ước lượng = 01/01 của (năm nay − tuổi)', () => {
    const { useUserProfileStore } = loadStore(false);

    useUserProfileStore.getState().hydrateFromServer(SNAPSHOT, EXTRAS);

    expect(useUserProfileStore.getState().dateOfBirth).toEqual(new Date(1996, 0, 1));
  });

  test('ngày sinh đang có vẫn khớp tuổi BE → giữ nguyên (không đánh mất ngày sinh vừa nhập)', () => {
    const { useUserProfileStore } = loadStore(false);
    const typedDob = new Date(1996, 5, 15); // 30 tuổi vào 02/10/2026
    useUserProfileStore.setState({ dateOfBirth: typedDob });

    useUserProfileStore.getState().hydrateFromServer(SNAPSHOT, EXTRAS);

    expect(useUserProfileStore.getState().dateOfBirth).toBe(typedDob);
  });

  test('BE đã lưu ngày sinh → dùng đúng ngày đó, không ước lượng', () => {
    const { useUserProfileStore } = loadStore(false);
    const typedDob = new Date(1995, 2, 8);

    useUserProfileStore
      .getState()
      .hydrateFromServer({ ...SNAPSHOT, age: 31, dateOfBirth: typedDob }, EXTRAS);

    expect(useUserProfileStore.getState().dateOfBirth).toBe(typedDob);
  });

  test('hydrate lần sau thay hẳn dữ liệu cũ (không cộng dồn dị ứng)', () => {
    const { useUserProfileStore } = loadStore(false);
    const hydrate = useUserProfileStore.getState().hydrateFromServer;

    hydrate(SNAPSHOT, EXTRAS);
    hydrate(
      { ...SNAPSHOT, allergyIds: [], healthConditionIds: [], dietaryPreferenceIds: [] },
      { localAllergyIds: [], localHealthConditionIds: [] },
    );

    expect(useUserProfileStore.getState()).toMatchObject({
      allergyIds: [],
      healthConditionIds: [],
      dietaryPreferenceIds: [],
    });
  });

  test('đăng xuất/xóa dữ liệu (resetUserData) đưa store về rỗng', () => {
    const { useUserProfileStore, resetUserData: reset } = loadStore(false);
    useUserProfileStore.getState().hydrateFromServer(SNAPSHOT, EXTRAS);

    reset();

    expect(useUserProfileStore.getState()).toMatchObject({
      weightKg: 0,
      allergyIds: [],
      dietaryPreferenceIds: [],
    });
  });
});
