/**
 * Live: đồng bộ vận động (health-sync) với backend thật — gửi TỔNG của ngày, gửi lại thay thế chứ
 * không cộng dồn, một ngày chỉ dùng MỘT nguồn ưu tiên cao nhất (BR-042), calo vận động cộng vào
 * ngân sách của Nhật ký và nút "Đồng bộ ngay" (số liệu mẫu ở DEV).
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type NutritionModule = typeof import('@/features/nutrition');
type ConnectModule = typeof import('@/features/profile/services/healthConnectService');
type ProfileStoreModule = typeof import('@/state/user/userProfileStore');
type StoreModule = typeof import('@/state/auth/authStore');

describeLive('đồng bộ vận động (backend thật)', () => {
  let authService: AuthModule['authService'];
  let nutrition: NutritionModule;
  let healthConnectService: ConnectModule['healthConnectService'];
  let useUserProfileStore: ProfileStoreModule['useUserProfileStore'];
  let useAuthStore: StoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    nutrition = require('@/features/nutrition') as NutritionModule;
    ({ healthConnectService } = require('@/features/profile/services/healthConnectService') as ConnectModule);
    ({ useUserProfileStore } = require('@/state/user/userProfileStore') as ProfileStoreModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
  });

  async function newUser() {
    const email = uniqueEmail('sync');
    const { user } = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    return user;
  }

  test('chưa đồng bộ gì: không có nguồn, không có giờ đồng bộ, mục tiêu bước mặc định', async () => {
    await newUser();

    const activity = await nutrition.healthSyncService.getDailySummary(nutrition.todayIso());

    expect(activity).toMatchObject({
      steps: 0,
      stepGoal: 10000,
      caloriesBurned: 0,
      sources: [],
      lastSyncedAt: null,
      hasSyncedData: false,
      sourceDetails: [],
    });
  });

  test('gửi tổng của ngày từ một nguồn; gửi lại cùng nguồn THAY THẾ chứ không cộng dồn', async () => {
    await newUser();
    const dateIso = nutrition.todayIso();

    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 6000,
      burnedCalories: 200,
      distanceMeters: 4300,
      source: 'GoogleFit',
    });
    const first = await nutrition.healthSyncService.getDailySummary(dateIso);
    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 8000,
      burnedCalories: 260,
      distanceMeters: 5600,
      source: 'GoogleFit',
    });
    const second = await nutrition.healthSyncService.getDailySummary(dateIso);

    expect(first).toMatchObject({ steps: 6000, caloriesBurned: 200, sources: ['GoogleFit'], hasSyncedData: true });
    expect(Math.abs(Date.now() - Date.parse(first.lastSyncedAt ?? ''))).toBeLessThan(5 * 60 * 1000);
    // 8000, không phải 14000: số liệu cũ của (ngày, nguồn) bị thay thế.
    expect(second).toMatchObject({ steps: 8000, caloriesBurned: 260, distanceMeters: 5600 });
  });

  test('nhiều nguồn: chỉ nguồn ưu tiên cao nhất được dùng, không cộng các nguồn lại (BR-042)', async () => {
    await newUser();
    const dateIso = nutrition.todayIso();
    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 8000,
      burnedCalories: 260,
      distanceMeters: 5600,
      source: 'GoogleFit',
    });
    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 1000,
      burnedCalories: 40,
      distanceMeters: 700,
      source: 'Manual',
    });

    const withLowerSource = await nutrition.healthSyncService.getDailySummary(dateIso);

    // Manual thấp hơn GoogleFit → vẫn dùng GoogleFit.
    expect(withLowerSource).toMatchObject({ steps: 8000, caloriesBurned: 260, sources: ['GoogleFit', 'Manual'] });

    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 7000,
      burnedCalories: 230,
      distanceMeters: 5000,
      source: 'HealthConnect',
    });
    const withHigherSource = await nutrition.healthSyncService.getDailySummary(dateIso);

    expect(withHigherSource).toMatchObject({
      steps: 7000,
      caloriesBurned: 230,
      sources: ['HealthConnect', 'GoogleFit', 'Manual'],
    });
    expect(withHigherSource.sourceDetails.map(source => [source.id, source.countsTowardBudget])).toEqual([
      ['HealthConnect', true],
      ['GoogleFit', false],
      ['Manual', false],
    ]);
  });

  test('nguồn không hợp lệ → BE từ chối bằng thông báo tiếng Việt, không ghi gì', async () => {
    await newUser();
    const dateIso = nutrition.todayIso();

    await expect(
      nutrition.healthSyncService.syncMetrics({
        dateIso,
        steps: 100,
        burnedCalories: 10,
        distanceMeters: 50,
        source: 'DevSample' as never,
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS' });
    expect((await nutrition.healthSyncService.getDailySummary(dateIso)).hasSyncedData).toBe(false);
  });

  test('calo vận động cộng vào ngân sách của Nhật ký khi bật công tắc, không cộng khi tắt', async () => {
    await newUser();
    const dateIso = nutrition.todayIso();
    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 6000,
      burnedCalories: 200,
      distanceMeters: 4300,
      source: 'GoogleFit',
    });

    useUserProfileStore.getState().setIncludeActivityCalories(true);
    const included = await nutrition.nutritionService.getDiaryDay(dateIso);
    useUserProfileStore.getState().setIncludeActivityCalories(false);
    const excluded = await nutrition.nutritionService.getDiaryDay(dateIso);

    expect(included.activityCalories).toBe(200);
    expect(excluded.activityCalories).toBe(0);
  });

  test('"Đồng bộ ngay" (DEV): gửi số liệu mẫu nguồn Manual; bấm lặp không nhân đôi; trạng thái hiện số liệu thật', async () => {
    await newUser();
    const dateIso = nutrition.todayIso();
    expect((await healthConnectService.getStatus()).lastSyncedLabel).toBe('Chưa đồng bộ');

    await healthConnectService.syncNow();
    await healthConnectService.syncNow();

    const activity = await nutrition.healthSyncService.getDailySummary(dateIso);
    const status = await healthConnectService.getStatus();
    expect(activity).toMatchObject({ steps: 6240, caloriesBurned: 180, sources: ['Manual'] });
    expect(status.lastSyncedLabel).toMatch(/^Hôm nay, \d{2}:\d{2}$/);
    expect(status.sources[0].todayValueLabel).toContain('6.240');
  });

  test('số liệu vận động của mỗi người dùng tách biệt', async () => {
    await newUser();
    const dateIso = nutrition.todayIso();
    await nutrition.healthSyncService.syncMetrics({
      dateIso,
      steps: 6000,
      burnedCalories: 200,
      distanceMeters: 4300,
      source: 'GoogleFit',
    });

    await newUser();

    expect((await nutrition.healthSyncService.getDailySummary(dateIso)).hasSyncedData).toBe(false);
  });
});
