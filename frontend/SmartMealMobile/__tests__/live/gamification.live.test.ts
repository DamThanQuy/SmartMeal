/**
 * Live: Bé Mầm, thử thách, huy hiệu với backend thật — nhiệm vụ và XP do server tính (ghi bữa sáng thì
 * nhiệm vụ xong và XP tăng đúng một lần), chuỗi ngày có ô hôm nay, tham gia thử thách mở khung từ hôm
 * nay, huy hiệu/trang phục đọc từ server (review PR #9 G1–G5). Chỉ chạy khi có LIVE_API_URL.
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type HealthTypesModule = typeof import('@/features/health/types/health.types');
type NutritionModule = typeof import('@/features/nutrition/services/nutritionService');
type GamificationModule = typeof import('@/features/gamification/services/gamificationService');
type ChallengeModule = typeof import('@/features/gamification/services/challengeService');
type BadgeModule = typeof import('@/features/gamification/services/badgeService');
type DateModule = typeof import('@/utils/date');
type AuthStoreModule = typeof import('@/state/auth/authStore');

describeLive('Bé Mầm, thử thách, huy hiệu (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let healthTypes: HealthTypesModule;
  let nutritionService: NutritionModule['nutritionService'];
  let gamificationService: GamificationModule['gamificationService'];
  let challengeService: ChallengeModule['challengeService'];
  let badgeService: BadgeModule['badgeService'];
  let dates: DateModule;
  let useAuthStore: AuthStoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    healthTypes = require('@/features/health/types/health.types') as HealthTypesModule;
    ({ nutritionService } = require('@/features/nutrition/services/nutritionService') as NutritionModule);
    ({ gamificationService } = require('@/features/gamification/services/gamificationService') as GamificationModule);
    ({ challengeService } = require('@/features/gamification/services/challengeService') as ChallengeModule);
    ({ badgeService } = require('@/features/gamification/services/badgeService') as BadgeModule);
    dates = require('@/utils/date') as DateModule;
    ({ useAuthStore } = require('@/state/auth/authStore') as AuthStoreModule);
  });

  async function newUser() {
    const { user } = await authService.register({ fullName: 'Người Thử', email: uniqueEmail('pet'), password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    await healthProfileService.submitHealthProfile({
      ...healthTypes.createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '6', year: '1995' },
      gender: 'male',
      heightCm: '175',
      weightKg: '70',
      goal: 'maintain',
      goalWeightKg: '70',
      activityLevel: 'moderate',
    });
    useAuthStore.setState({ pendingUser: null, user, isAuthenticated: true });
  }

  test('ghi bữa sáng → nhiệm vụ xong và XP tăng đúng một lần; ô hôm nay trong chuỗi ngày sáng lên', async () => {
    await newUser();
    const before = await gamificationService.getPetState();
    expect(before.tasks.map(task => task.id)).toEqual(['breakfast', 'protein', 'water']);
    expect(before.tasks.find(task => task.id === 'breakfast')?.completed).toBe(false);
    expect(before.challenge).toBeNull();

    await nutritionService.addLogEntries(dates.todayIso(), 'breakfast', [
      {
        foodName: 'Phở bò',
        servingLabel: '1 tô',
        grams: 500,
        nutrition: { calories: 450, proteinG: 25, carbsG: 55, fatG: 12 },
        source: 'manual',
      },
    ]);
    const after = await gamificationService.getPetState();
    const again = await gamificationService.getPetState();

    expect(after.tasks.find(task => task.id === 'breakfast')).toMatchObject({ completed: true, progressLabel: 'Xong' });
    const gained = after.level * after.xpPerLevel + after.xpIntoLevel - (before.level * before.xpPerLevel + before.xpIntoLevel);
    expect(gained).toBeGreaterThanOrEqual(10);
    expect(again.xpIntoLevel).toBe(after.xpIntoLevel); // đọc lại không cộng thêm (BR-202)
    expect(after.streakDays).toBeGreaterThanOrEqual(1);
    const mondayBased = (new Date().getDay() + 6) % 7;
    expect(after.weekCompletion[mondayBased]).toBe(true);
  });

  test('tham gia thử thách mở khung từ hôm nay và hiện trên màn Bé Mầm', async () => {
    await newUser();
    const [first] = await challengeService.getChallenges();
    expect(first.joined).toBe(false);

    await challengeService.joinChallenge(first.id);
    const joined = (await challengeService.getChallenges()).find(challenge => challenge.id === first.id);

    expect(joined).toMatchObject({ joined: true, startIso: dates.todayIso(), dayCurrent: 1, completed: false });
    expect((await gamificationService.getPetState()).challenge?.title).toBe(first.title);
  });

  test('huy hiệu và trang phục đọc từ server; trang phục chưa mở thì không mặc được', async () => {
    await newUser();
    const summary = await badgeService.getBadgesSummary();

    expect(summary.totalBadgeCount).toBe(summary.badges.length);
    expect(summary.badges.map(badge => badge.id)).toContain('first-log');
    const locked = summary.costumes.find(costume => !costume.unlocked);
    expect(locked).toBeDefined();
    await expect(badgeService.equipCostume(locked!.id)).rejects.toMatchObject({ code: 'BUSINESS' });
  });
});
