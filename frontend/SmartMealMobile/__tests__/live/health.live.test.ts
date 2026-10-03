/**
 * Live: hồ sơ sức khỏe với backend thật — gửi/đọc NGÀY SINH thật, dị ứng/bệnh lý/chế độ ăn theo
 * code của /meta, sửa từng phần bằng PUT (không thêm dòng cân nặng), mục "Khác" giữ cục bộ.
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type MetaModule = typeof import('@/features/health/services/metaCatalog');
type TypesModule = typeof import('@/features/health/types/health.types');
type StoreModule = typeof import('@/state/auth/authStore');

describeLive('health profile (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let getMetaCatalog: MetaModule['getMetaCatalog'];
  let types: TypesModule;
  let useAuthStore: StoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    ({ getMetaCatalog } = require('@/features/health/services/metaCatalog') as MetaModule);
    types = require('@/features/health/types/health.types') as TypesModule;
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
  });

  async function newUser() {
    const email = uniqueEmail('health');
    const { user } = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    return user;
  }

  function form(overrides: Partial<import('@/features/health/types/health.types').HealthProfileFormData> = {}) {
    return {
      ...types.createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '6', year: '1995' },
      gender: 'male' as const,
      heightCm: '175',
      weightKg: '70',
      goal: 'lose' as const,
      goalWeightKg: '65',
      activityLevel: 'moderate' as const,
      allergyIds: ['seafood', 'treeNut', 'other'],
      healthConditionIds: ['diabetes'],
      dietaryPreferenceIds: ['keto', 'lowCarb'],
      ...overrides,
    };
  }

  test('danh mục /meta thật có code cho mọi lựa chọn của giao diện (trừ "Khác")', async () => {
    const catalog = await getMetaCatalog();

    for (const option of types.ALLERGY_OPTIONS.filter(o => o.id !== 'other')) {
      expect(catalog.allergies.hasCode(option.id)).toBe(true);
    }
    for (const option of types.HEALTH_CONDITION_OPTIONS.filter(o => o.id !== 'other')) {
      expect(catalog.conditions.hasCode(option.id)).toBe(true);
    }
    for (const option of types.DIETARY_PREFERENCE_OPTIONS) {
      expect(catalog.tags.hasCode(option.id)).toBe(true);
    }
  });

  test('khảo sát lưu ngày sinh thật, dị ứng, bệnh lý, chế độ ăn; đọc lại đúng và giữ mục "Khác" ở máy', async () => {
    const user = await newUser();

    const result = await healthProfileService.submitHealthProfile(form());
    const loaded = await healthProfileService.getHealthProfile(user.id);

    expect(result.calorieTarget).toBeGreaterThan(1200);
    expect(loaded?.snapshot).toMatchObject({
      gender: 'male',
      heightCm: 175,
      weightKg: 70,
      goalWeightKg: 65,
      goal: 'lose',
      activityLevel: 'moderate',
      healthConditionIds: ['diabetes'],
    });
    // Ngày sinh do BE lưu (không còn ước lượng 01/01 từ tuổi).
    expect(loaded?.snapshot.dateOfBirth).toEqual(new Date(1995, 5, 15));
    expect(loaded?.snapshot.allergyIds.sort()).toEqual(['seafood', 'treeNut']);
    expect(loaded?.snapshot.dietaryPreferenceIds.sort()).toEqual(['keto', 'lowCarb']);
    expect(loaded?.snapshot.waterGoalMl).toBe(2000);
    expect(loaded?.extras.localAllergyIds).toEqual(['other']);
  });

  test('sửa chiều cao/ngày sinh bằng PUT: tính lại chỉ số, giữ dị ứng/chế độ ăn, KHÔNG thêm dòng cân nặng', async () => {
    const user = await newUser();
    await healthProfileService.submitHealthProfile(form());
    const before = (await healthProfileService.getHealthProfile(user.id))!;
    const historyBefore = await healthProfileService.getWeightHistory();

    const updated = await healthProfileService.updateBasicInfo(
      { gender: 'female', dateOfBirth: new Date(1990, 2, 8), heightCm: 160 },
      {
        gender: 'male',
        dateOfBirth: new Date(1995, 5, 15),
        heightCm: 175,
        weightKg: 70,
        goalWeightKg: 65,
        activityLevel: 'moderate',
        goal: 'lose',
        allergyIds: ['seafood', 'treeNut'],
        healthConditionIds: ['diabetes'],
        dietaryPreferenceIds: ['keto', 'lowCarb'],
      },
    );

    expect(updated.snapshot).toMatchObject({ gender: 'female', heightCm: 160 });
    expect(updated.snapshot.dateOfBirth).toEqual(new Date(1990, 2, 8));
    expect(updated.snapshot.result.bmi).not.toBe(before.snapshot.result.bmi);
    expect(updated.snapshot.allergyIds.sort()).toEqual(['seafood', 'treeNut']);
    expect(updated.snapshot.dietaryPreferenceIds.sort()).toEqual(['keto', 'lowCarb']);
    expect(await healthProfileService.getWeightHistory()).toHaveLength(historyBefore.length);
  });

  test('đổi dị ứng/bệnh lý/chế độ ăn bằng PUT, kể cả "Không có" (xóa hết) và chỉ đổi chế độ ăn', async () => {
    const user = await newUser();
    await healthProfileService.submitHealthProfile(form());
    const current = {
      gender: 'male' as const,
      dateOfBirth: new Date(1995, 5, 15),
      heightCm: 175,
      weightKg: 70,
      goalWeightKg: 65,
      activityLevel: 'moderate' as const,
      goal: 'lose' as const,
      allergyIds: ['seafood'],
      healthConditionIds: [],
      dietaryPreferenceIds: ['keto'],
    };

    const dietOnly = await healthProfileService.updateHealthSettings(
      { allergyIds: ['seafood', 'treeNut', 'other'], healthConditionIds: ['diabetes'], dietaryPreferenceIds: ['vegan'] },
      current,
    );
    expect(dietOnly?.snapshot.dietaryPreferenceIds).toEqual(['vegan']);

    const cleared = await healthProfileService.updateHealthSettings(
      { allergyIds: [], healthConditionIds: [], dietaryPreferenceIds: [] },
      current,
    );
    expect(cleared?.snapshot).toMatchObject({ allergyIds: [], healthConditionIds: [], dietaryPreferenceIds: [] });
    expect((await healthProfileService.getHealthProfile(user.id))?.extras.localAllergyIds).toEqual([]);
  });

  test('ghi cân nặng thêm đúng một dòng lịch sử và trả chỉ số tính lại', async () => {
    const user = await newUser();
    await healthProfileService.submitHealthProfile(form());
    const before = await healthProfileService.getWeightHistory();
    const profileBefore = (await healthProfileService.getHealthProfile(user.id))!;

    const after = await healthProfileService.recordWeight(
      { weightKg: 68, dateIso: new Date().toISOString().slice(0, 10) },
      {
        gender: 'male',
        dateOfBirth: new Date(1995, 5, 15),
        heightCm: 175,
        weightKg: 70,
        goalWeightKg: 65,
        activityLevel: 'moderate',
        goal: 'lose',
        allergyIds: [],
        healthConditionIds: [],
        dietaryPreferenceIds: [],
      },
    );

    expect(after.snapshot.weightKg).toBe(68);
    expect(after.snapshot.result.bmi).toBeLessThan(profileBefore.snapshot.result.bmi);
    expect(await healthProfileService.getWeightHistory()).toHaveLength(before.length + 1);
  });

  test('ngày sinh không hợp lệ (dưới 13 tuổi) → BE từ chối bằng thông báo tiếng Việt', async () => {
    await newUser();
    const tooYoung = new Date().getFullYear() - 5;

    await expect(
      healthProfileService.submitHealthProfile(form({ dateOfBirth: { day: '1', month: '1', year: String(tooYoung) } })),
    ).rejects.toMatchObject({ code: 'BUSINESS' });
  });

  test('tài khoản chưa khảo sát → getHealthProfile trả null (404 được hiểu là chưa có hồ sơ)', async () => {
    const user = await newUser();

    await expect(healthProfileService.getHealthProfile(user.id)).resolves.toBeNull();
  });
});
