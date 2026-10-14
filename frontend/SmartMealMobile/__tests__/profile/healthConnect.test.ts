/**
 * Health Connect (docs/fetch-api/part1 §9): "đã kết nối"/nguồn nào bật là tùy chọn cục bộ, số liệu
 * hôm nay lấy từ backend (health-sync). Nút "Đồng bộ ngay" chỉ gửi số liệu mẫu (nguồn Manual) ở DEV;
 * BE thay thế số liệu của (ngày, nguồn) nên bấm lặp không làm số bước nhân đôi.
 */
import { format } from 'date-fns';
import { toHealthConnectState } from '@/features/profile/services/healthConnect.mapper';
import {
  DEFAULT_HEALTH_CONNECT_PREFERENCES,
  parseHealthConnectPreferences,
  type HealthConnectPreferences,
} from '@/features/profile/services/healthConnectPreferences';
import type { DailyActivity } from '@/features/nutrition';

// healthConnectPreferences import storage (AsyncStorage native) — không có trong Jest.
jest.mock('@/services/storage/storage', () => ({
  storageService: { getString: jest.fn(), setString: jest.fn(), delete: jest.fn() },
}));

const ACTIVITY: DailyActivity = {
  dateIso: '2026-10-02',
  steps: 6240,
  stepGoal: 10000,
  caloriesBurned: 180,
  distanceMeters: 4300,
  sources: ['GoogleFit'],
  lastSyncedAt: '2026-10-02T01:30:00Z',
  hasSyncedData: true,
  sourceDetails: [],
  activities: [],
};

describe('parseHealthConnectPreferences', () => {
  test('chưa lưu / dữ liệu hỏng → mặc định (đã kết nối, bật mọi nguồn)', () => {
    expect(parseHealthConnectPreferences(undefined)).toEqual(DEFAULT_HEALTH_CONNECT_PREFERENCES);
    expect(parseHealthConnectPreferences('{không phải json')).toEqual(
      DEFAULT_HEALTH_CONNECT_PREFERENCES,
    );
    expect(parseHealthConnectPreferences('123')).toEqual(DEFAULT_HEALTH_CONNECT_PREFERENCES);
    expect(parseHealthConnectPreferences('null')).toEqual(DEFAULT_HEALTH_CONNECT_PREFERENCES);
  });

  test('đọc lại đúng tùy chọn đã lưu, bỏ id nguồn lạ', () => {
    expect(
      parseHealthConnectPreferences(
        JSON.stringify({ connected: false, disabledSources: ['distance', 'khong-co', 5] }),
      ),
    ).toEqual({ connected: false, disabledSources: ['distance'] });
  });

  test('connected sai kiểu → dùng mặc định', () => {
    expect(parseHealthConnectPreferences(JSON.stringify({ connected: 'no' })).connected).toBe(true);
  });
});

describe('healthConnectPreferences (lưu theo user)', () => {
  function load() {
    const storage = {
      getString: jest.fn(),
      setString: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };
    jest.resetModules();
    jest.doMock('@/services/storage/storage', () => ({ storageService: storage }));
    const module =
      require('@/features/profile/services/healthConnectPreferences') as typeof import('@/features/profile/services/healthConnectPreferences');
    const { useAuthStore } =
      require('@/state/auth/authStore') as typeof import('@/state/auth/authStore');
    return { ...module, storage, useAuthStore };
  }

  test('ghi/đọc theo khóa của user hiện tại; chưa đăng nhập dùng khóa "guest"', async () => {
    const { healthConnectPreferences, storage, useAuthStore } = load();
    const preferences: HealthConnectPreferences = { connected: false, disabledSources: ['steps'] };

    await healthConnectPreferences.save(preferences);
    expect(storage.setString).toHaveBeenLastCalledWith(
      'user.healthConnect.guest',
      JSON.stringify(preferences),
    );

    useAuthStore.setState({
      pendingUser: {
        id: 'user-7',
        fullName: 'A',
        email: 'a@x.vn',
        avatarUrl: null,
        isPro: false,
        role: 'User',
        hasCompletedSurvey: false,
      },
    });
    storage.getString.mockResolvedValue(JSON.stringify(preferences));

    expect(await healthConnectPreferences.load()).toEqual(preferences);
    expect(storage.getString).toHaveBeenCalledWith('user.healthConnect.user-7');
  });

  test('storage lỗi khi đọc → mặc định, không ném lỗi', async () => {
    const { healthConnectPreferences, storage } = load();
    storage.getString.mockRejectedValue(new Error('disk'));

    expect(await healthConnectPreferences.load()).toEqual(DEFAULT_HEALTH_CONNECT_PREFERENCES);
  });
});

describe('toHealthConnectState', () => {
  test('ghép tùy chọn cục bộ với số liệu hôm nay của BE', () => {
    const state = toHealthConnectState(
      { connected: true, disabledSources: ['distance'] },
      ACTIVITY,
    );

    expect(state.connected).toBe(true);
    expect(state.lastSyncedLabel).toBe(
      `Hôm nay, ${format(new Date('2026-10-02T01:30:00Z'), 'HH:mm')}`,
    );
    expect(state.sources.map(source => [source.id, source.enabled])).toEqual([
      ['steps', true],
      ['distance', false],
      ['activeCalories', true],
    ]);
    expect(state.sources[0].todayValueLabel).toBe(`Hôm nay: ${(6240).toLocaleString('vi-VN')} bước`);
    expect(state.sources[1].todayValueLabel).toBe(
      `Hôm nay: ${(4.3).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`,
    );
    expect(state.sources[2].todayValueLabel).toBe('Hôm nay: 180 kcal');
  });

  test('hôm nay chưa đồng bộ → "Chưa đồng bộ" và số liệu 0', () => {
    const state = toHealthConnectState(DEFAULT_HEALTH_CONNECT_PREFERENCES, {
      ...ACTIVITY,
      steps: 0,
      caloriesBurned: 0,
      distanceMeters: 0,
      sources: [],
      lastSyncedAt: null,
      hasSyncedData: false,
    });

    expect(state.lastSyncedLabel).toBe('Chưa đồng bộ');
    expect(state.sources[0].todayValueLabel).toBe('Hôm nay: 0 bước');
    expect(state.sources[2].todayValueLabel).toBe('Hôm nay: 0 kcal');
  });

  test('chưa kết nối', () => {
    expect(
      toHealthConnectState({ connected: false, disabledSources: [] }, ACTIVITY).connected,
    ).toBe(false);
  });
});

describe('healthConnectApiService', () => {
  type DevFlag = { __DEV__: boolean };

  function load() {
    const healthSync = { getDailySummary: jest.fn(), syncMetrics: jest.fn() };
    const preferences = { load: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    jest.resetModules();
    jest.doMock('@/features/nutrition', () => ({ healthSyncService: healthSync }));
    jest.doMock('@/features/profile/services/healthConnectPreferences', () => ({
      healthConnectPreferences: preferences,
    }));
    const { healthConnectApiService } =
      require('@/features/profile/services/healthConnectService.api') as typeof import('@/features/profile/services/healthConnectService.api');
    return { service: healthConnectApiService, healthSync, preferences };
  }

  afterEach(() => {
    (globalThis as unknown as DevFlag).__DEV__ = true;
  });

  test('getStatus: tùy chọn cục bộ + số liệu hôm nay từ health-sync', async () => {
    const { service, healthSync, preferences } = load();
    preferences.load.mockResolvedValue({ connected: true, disabledSources: ['steps'] });
    healthSync.getDailySummary.mockResolvedValue(ACTIVITY);

    const status = await service.getStatus?.();

    expect(healthSync.getDailySummary).toHaveBeenCalledTimes(1);
    expect(status?.connected).toBe(true);
    expect(status?.sources.map(source => source.enabled)).toEqual([false, true, true]);
  });

  test('toggleSource: bật/tắt nguồn trong tùy chọn cục bộ', async () => {
    const { service, preferences } = load();
    preferences.load.mockResolvedValue({ connected: true, disabledSources: ['steps'] });

    await service.toggleSource?.('steps');
    expect(preferences.save).toHaveBeenLastCalledWith({ connected: true, disabledSources: [] });

    await service.toggleSource?.('distance');
    expect(preferences.save).toHaveBeenLastCalledWith({
      connected: true,
      disabledSources: ['steps', 'distance'],
    });
  });

  test('connect / disconnect đổi cờ "đã kết nối", giữ nguồn đã tắt', async () => {
    const { service, preferences } = load();
    preferences.load.mockResolvedValue({ connected: true, disabledSources: ['steps'] });

    await service.disconnect?.();
    expect(preferences.save).toHaveBeenLastCalledWith({ connected: false, disabledSources: ['steps'] });

    await service.connect?.();
    expect(preferences.save).toHaveBeenLastCalledWith({ connected: true, disabledSources: ['steps'] });
  });

  test('syncNow ở DEV: gửi số liệu mẫu (nguồn "Manual") với ngày giờ máy', async () => {
    const { service, healthSync } = load();

    await service.syncNow?.();

    expect(healthSync.syncMetrics).toHaveBeenCalledTimes(1);
    expect(healthSync.syncMetrics).toHaveBeenCalledWith({
      dateIso: format(new Date(), 'yyyy-MM-dd'),
      steps: 6240,
      burnedCalories: 180,
      distanceMeters: 4300,
      source: 'Manual',
    });
  });

  test('syncNow ở DEV: bấm lặp vẫn gửi (BE thay thế số liệu cũ) và không cần đọc số liệu hôm nay trước', async () => {
    const { service, healthSync } = load();

    await service.syncNow?.();
    await service.syncNow?.();

    expect(healthSync.syncMetrics).toHaveBeenCalledTimes(2);
    expect(healthSync.getDailySummary).not.toHaveBeenCalled();
  });

  test('syncNow ngoài DEV: báo rõ cần Dev Client, không gọi API', async () => {
    const { service, healthSync } = load();
    (globalThis as unknown as DevFlag).__DEV__ = false;

    await expect(service.syncNow?.()).rejects.toThrow('Dev Client');
    expect(healthSync.getDailySummary).not.toHaveBeenCalled();
    expect(healthSync.syncMetrics).not.toHaveBeenCalled();
  });
});
