/**
 * healthProfileService.mock (EXPO_PUBLIC_USE_MOCK_API=true): giữ đúng hành vi mock cũ của store —
 * ghi cân nặng/đổi thông tin cơ bản tính lại chỉ số qua đúng 1 công thức, lịch sử cân nặng nằm ở
 * "server" mock (mới → cũ) và được reset khi xóa dữ liệu.
 */
import { calculateHealthProfileResult } from '@/features/health/services/healthCalculator';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileInput,
} from '@/features/health/types/health.types';

type Scenario = 'success' | 'error';

function load(scenario: Scenario = 'success') {
  const resets = new Map<string, () => void>();

  jest.resetModules();
  jest.doMock('@/config/mock', () => ({ getMockDelayMs: () => 0, wait: async () => undefined }));
  jest.doMock('@/state/app/appStore', () => ({ getCurrentMockScenario: () => scenario }));
  jest.doMock('@/state/resetUserData', () => ({
    registerUserDataReset: (name: string, fn: () => void) => resets.set(name, fn),
  }));

  const { healthProfileMockService } =
    require('@/features/health/services/healthProfileService.mock') as typeof import('@/features/health/services/healthProfileService.mock');
  return { service: healthProfileMockService, resets };
}

type MockService = ReturnType<typeof load>['service'];

const CURRENT: HealthProfileInput = {
  gender: 'male',
  dateOfBirth: new Date(2002, 0, 15),
  heightCm: 172,
  weightKg: 68,
  goalWeightKg: 62,
  activityLevel: 'sedentary',
  goal: 'maintain',
  allergyIds: ['dairy', 'peanut'],
  healthConditionIds: [],
  dietaryPreferenceIds: ['eatClean'],
};

describe('getWeightHistory', () => {
  test('lịch sử mẫu mới → cũ khớp design (68,0 kg gần nhất)', async () => {
    const { service } = load();

    const history = await service.getWeightHistory();

    expect(history.map(entry => entry.weightKg)).toEqual([68, 68.6, 69.2, 69.5]);
    expect(history[0].dateIso).toBe('2026-09-27');
  });

  test('trả bản sao — sửa kết quả không làm hỏng dữ liệu "server"', async () => {
    const { service } = load();

    (await service.getWeightHistory())[0].weightKg = 1;

    expect((await service.getWeightHistory())[0].weightKg).toBe(68);
  });
});

describe('recordWeight', () => {
  test('tính lại BMI→BMR→TDEE→Calorie→Macro bằng đúng 1 công thức và thêm vào đầu lịch sử', async () => {
    const { service } = load();

    const { snapshot } = await service.recordWeight({ weightKg: 65, dateIso: '2026-10-02' }, CURRENT);

    expect(snapshot.weightKg).toBe(65);
    expect(snapshot.result).toEqual(calculateHealthProfileResult({ ...CURRENT, weightKg: 65 }));
    expect(snapshot.dateOfBirth).toBe(CURRENT.dateOfBirth);
    const history = await service.getWeightHistory();
    expect(history[0]).toMatchObject({ dateIso: '2026-10-02', weightKg: 65 });
    expect(history).toHaveLength(5);
  });
});

describe('updateBasicInfo', () => {
  test('đổi giới tính/ngày sinh/chiều cao → tính lại chỉ số, không đụng lịch sử cân nặng', async () => {
    const { service } = load();
    const dateOfBirth = new Date(1990, 5, 1);

    const { snapshot } = await service.updateBasicInfo(
      { gender: 'female', dateOfBirth, heightCm: 160 },
      CURRENT,
    );

    expect(snapshot).toMatchObject({ gender: 'female', heightCm: 160, weightKg: 68 });
    expect(snapshot.dateOfBirth).toBe(dateOfBirth);
    expect(snapshot.result).toEqual(
      calculateHealthProfileResult({ ...CURRENT, gender: 'female', dateOfBirth, heightCm: 160 }),
    );
    expect(await service.getWeightHistory()).toHaveLength(4);
  });
});

describe('updateHealthSettings', () => {
  test('dị ứng/chế độ ăn không đổi chỉ số → không có snapshot mới (null)', async () => {
    const { service } = load();

    await expect(
      service.updateHealthSettings(
        { allergyIds: [], healthConditionIds: ['gout'], dietaryPreferenceIds: ['keto'] },
        CURRENT,
      ),
    ).resolves.toBeNull();
  });
});

describe('submitHealthProfile', () => {
  test('trả kết quả tính sẵn và ghi cân nặng ban đầu vào lịch sử', async () => {
    const { service } = load();
    const form = {
      ...createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '1', year: '2002' },
      gender: 'male' as const,
      heightCm: '172',
      weightKg: '70',
      goal: 'lose' as const,
      activityLevel: 'light' as const,
    };

    const result = await service.submitHealthProfile(form);

    expect(result).toEqual(
      calculateHealthProfileResult({
        gender: 'male',
        dateOfBirth: new Date(2002, 0, 15),
        heightCm: 172,
        weightKg: 70,
        activityLevel: 'light',
        goal: 'lose',
      }),
    );
    const history = await service.getWeightHistory();
    expect(history[0].weightKg).toBe(70);
    expect(history).toHaveLength(5);
  });
});

describe('scenario lỗi (màn Dev)', () => {
  const calls: [string, (service: MockService) => Promise<unknown>][] = [
    ['getWeightHistory', service => service.getWeightHistory()],
    [
      'recordWeight',
      service => service.recordWeight({ weightKg: 60, dateIso: '2026-10-02' }, CURRENT),
    ],
    [
      'updateBasicInfo',
      service =>
        service.updateBasicInfo(
          { gender: 'male', dateOfBirth: CURRENT.dateOfBirth, heightCm: 170 },
          CURRENT,
        ),
    ],
    [
      'updateHealthSettings',
      service =>
        service.updateHealthSettings(
          { allergyIds: [], healthConditionIds: [], dietaryPreferenceIds: [] },
          CURRENT,
        ),
    ],
  ];

  test.each(calls)('%s → ném lỗi', async (_name, call) => {
    const { service } = load('error');

    await expect(call(service)).rejects.toThrow();
  });
});

describe('xóa dữ liệu cá nhân (BR-271)', () => {
  test('resetUserData đưa lịch sử cân nặng về dữ liệu mẫu', async () => {
    const { service, resets } = load();
    await service.recordWeight({ weightKg: 60, dateIso: '2026-10-02' }, CURRENT);
    expect(await service.getWeightHistory()).toHaveLength(5);

    resets.get('weightHistory')?.();

    expect(await service.getWeightHistory()).toHaveLength(4);
  });
});
