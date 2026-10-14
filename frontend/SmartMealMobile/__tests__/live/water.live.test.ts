/**
 * Live: nước uống với backend thật — ghi, đọc 1 ngày/7 ngày, hoàn tác (xóa lần mới nhất), xóa theo id
 * và mục tiêu nước lưu trong hồ sơ sức khỏe trên server.
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type WaterModule = typeof import('@/features/gamification/services/waterService');
type HealthTypesModule = typeof import('@/features/health/types/health.types');
type DateModule = typeof import('@/utils/date');
type StoreModule = typeof import('@/state/auth/authStore');

describeLive('nước uống (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let waterService: WaterModule['waterService'];
  let healthTypes: HealthTypesModule;
  let dates: DateModule;
  let useAuthStore: StoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    ({ waterService } = require('@/features/gamification/services/waterService') as WaterModule);
    healthTypes = require('@/features/health/types/health.types') as HealthTypesModule;
    dates = require('@/utils/date') as DateModule;
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
  });

  async function newUser() {
    const email = uniqueEmail('water');
    const { user } = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    return user;
  }

  function submitSurvey() {
    return healthProfileService.submitHealthProfile({
      ...healthTypes.createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '6', year: '1995' },
      gender: 'male',
      heightCm: '175',
      weightKg: '70',
      goal: 'lose',
      goalWeightKg: '65',
      activityLevel: 'moderate',
    });
  }

  test('người dùng mới: chưa uống gì, mục tiêu mặc định 2000 ml', async () => {
    await newUser();

    const summary = await waterService.getDaySummary(dates.todayIso());

    expect(summary).toEqual({ dateIso: dates.todayIso(), entries: [], totalMl: 0, goalMl: 2000 });
  });

  test('ghi nhiều lần: tổng cộng dồn, các lần uống theo thứ tự cũ → mới, mỗi lần có id và giờ', async () => {
    await newUser();
    const today = dates.todayIso();

    const first = await waterService.addEntry(today, 250);
    await waterService.addEntry(today, 500);
    await waterService.addEntry(today, 100);
    const summary = await waterService.getDaySummary(today);

    expect(first.id).toEqual(expect.any(String));
    expect(first.id).not.toBe('');
    expect(summary.totalMl).toBe(850);
    expect(summary.entries.map(entry => entry.amountMl)).toEqual([250, 500, 100]);
    expect(summary.entries[0].id).toBe(first.id);
    expect(summary.entries.every(entry => /^\d{2}:\d{2}$/.test(entry.timeLabel))).toBe(true);
  });

  test('"Hoàn tác" xóa đúng lần uống mới nhất; không còn gì để hoàn tác thì không lỗi', async () => {
    await newUser();
    const today = dates.todayIso();
    await waterService.addEntry(today, 250);
    await waterService.addEntry(today, 500);

    await waterService.undoLastEntry(today);
    expect((await waterService.getDaySummary(today)).entries.map(entry => entry.amountMl)).toEqual([250]);

    await waterService.undoLastEntry(today);
    await expect(waterService.undoLastEntry(today)).resolves.toBeUndefined();
    expect((await waterService.getDaySummary(today)).totalMl).toBe(0);
  });

  test('xóa một lần uống theo id; xóa lại → NOT_FOUND', async () => {
    await newUser();
    const today = dates.todayIso();
    const keep = await waterService.addEntry(today, 250);
    const drop = await waterService.addEntry(today, 300);

    await waterService.deleteEntry(today, drop.id);

    const summary = await waterService.getDaySummary(today);
    expect(summary.entries.map(entry => entry.id)).toEqual([keep.id]);
    await expect(waterService.deleteEntry(today, drop.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('lượng nước ngoài 1–5000 ml → BE từ chối bằng thông báo tiếng Việt, không ghi gì', async () => {
    await newUser();
    const today = dates.todayIso();

    await expect(waterService.addEntry(today, 9000)).rejects.toMatchObject({
      code: 'BUSINESS',
      message: expect.stringContaining('5000'),
    });
    expect((await waterService.getDaySummary(today)).totalMl).toBe(0);
  });

  test('7 ngày qua: đủ 7 ngày kết thúc hôm nay, ngày trống = 0, đếm số ngày đạt mục tiêu', async () => {
    await newUser();
    const today = dates.todayIso();
    const yesterday = dates.addDaysIso(today, -1);
    await waterService.addEntry(yesterday, 2000);
    await waterService.addEntry(today, 750);

    const week = await waterService.getWeekSummary(today);

    expect(week.days).toHaveLength(7);
    expect(week.days[6]).toMatchObject({ dateIso: today, totalMl: 750, goalMl: 2000, isToday: true });
    expect(week.days[5]).toMatchObject({ dateIso: yesterday, totalMl: 2000 });
    expect(week.days.slice(0, 5).every(day => day.totalMl === 0)).toBe(true);
    expect(week.daysOnTarget).toBe(1);
  });

  test('đổi mục tiêu nước lưu vào hồ sơ trên server và hiện ở nhật ký + 7 ngày qua; ngoài 500–10000 ml bị từ chối', async () => {
    await newUser();
    await submitSurvey();
    const today = dates.todayIso();

    const updated = await healthProfileService.updateWaterGoal(2400);

    expect(updated?.snapshot.waterGoalMl).toBe(2400);
    expect((await waterService.getDaySummary(today)).goalMl).toBe(2400);
    expect((await waterService.getWeekSummary(today)).days.every(day => day.goalMl === 2400)).toBe(true);
    await expect(healthProfileService.updateWaterGoal(50)).rejects.toMatchObject({
      code: 'BUSINESS',
      message: expect.stringContaining('500'),
    });
    expect((await waterService.getDaySummary(today)).goalMl).toBe(2400);
  });

  test('nước uống của mỗi người dùng tách biệt', async () => {
    await newUser();
    const today = dates.todayIso();
    await waterService.addEntry(today, 500);

    await newUser();

    expect((await waterService.getDaySummary(today)).totalMl).toBe(0);
  });
});
