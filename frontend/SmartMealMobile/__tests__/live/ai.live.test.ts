/**
 * Live: AI với backend thật — hạn mức (5 lượt/ngày cho Free, Pro không giới hạn), Voice Log từ văn bản,
 * lượt chỉ bị trừ khi AI thành công, hết lượt → 429 và chuyển sang Pro thì dùng lại được. Backend
 * Development chưa cấu hình Gemini trả dữ liệu MẪU (isDemo). Không kiểm AI Snap (multipart) vì adapter
 * Node của test live chưa gửi được FormData của React Native.
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type AiModule = typeof import('@/features/ai/services/aiService');
type PremiumModule = typeof import('@/features/premium/services/premiumService');
type StoreModule = typeof import('@/state/auth/authStore');

describeLive('AI (backend thật)', () => {
  let authService: AuthModule['authService'];
  let ai: AiModule;
  let premiumService: PremiumModule['premiumService'];
  let useAuthStore: StoreModule['useAuthStore'];

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ai = require('@/features/ai/services/aiService') as AiModule;
    ({ premiumService } = require('@/features/premium/services/premiumService') as PremiumModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
  });

  async function newUser() {
    const email = uniqueEmail('ai');
    const { user } = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    return user;
  }

  const MEAL_TEXT = 'Sáng nay tôi ăn một tô bún bò và uống một ly nước cam';

  test('tài khoản Free mới: 5 lượt/ngày, chưa dùng lượt nào, làm mới trong vòng 24 giờ tới (đúng đầu giờ)', async () => {
    await newUser();

    const quota = await ai.aiService.getQuota();

    expect(quota).toMatchObject({ isUnlimited: false, limit: 5, used: 0, remaining: 5 });
    const untilReset = new Date(quota.resetsAtIso).getTime() - Date.now();
    expect(untilReset).toBeGreaterThan(0);
    expect(untilReset).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect(new Date(quota.resetsAtIso).getUTCMinutes()).toBe(0);
  });

  test('Voice Log từ văn bản: trả các món kèm dinh dưỡng, bữa theo lựa chọn, và trừ đúng một lượt', async () => {
    await newUser();

    const result = await ai.aiService.transcribeVoice('breakfast', MEAL_TEXT);
    const quota = await ai.aiService.getQuota();

    expect(result.mealType).toBe('breakfast');
    expect(result.transcript).toBe(MEAL_TEXT);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every(item => item.grams > 0 && item.nutrition.calories >= 0)).toBe(true);
    expect(quota).toMatchObject({ used: 1, remaining: 4 });
  });

  test('văn bản không hợp lệ (quá ngắn) → BE từ chối và KHÔNG trừ lượt', async () => {
    await newUser();

    await expect(ai.aiService.transcribeVoice('breakfast', 'a')).rejects.toMatchObject({ code: 'BUSINESS' });

    expect((await ai.aiService.getQuota()).used).toBe(0);
  });

  test('không có văn bản (chưa có nhận dạng giọng nói) → báo chưa hỗ trợ, không gọi BE, không trừ lượt', async () => {
    await newUser();

    await expect(ai.aiService.transcribeVoice('breakfast')).rejects.toThrow('chưa được hỗ trợ');

    expect((await ai.aiService.getQuota()).used).toBe(0);
  });

  test('hết 5 lượt → lượt thứ 6 bị từ chối 429 (nhận ra được để mở màn "Hết lượt AI"); nâng cấp Pro thì dùng lại được', async () => {
    await newUser();
    for (let used = 0; used < 5; used += 1) {
      await ai.aiService.transcribeVoice('lunch', MEAL_TEXT);
    }

    const blocked = await ai.aiService.transcribeVoice('lunch', MEAL_TEXT).catch((error: unknown) => error);

    expect(ai.isAiQuotaExceededError(blocked)).toBe(true);
    expect((blocked as Error).message).toContain('5 lượt AI miễn phí');
    expect(await ai.aiService.getQuota()).toMatchObject({ used: 5, remaining: 0 });

    await premiumService.checkout('monthly', 'vnpay');

    expect(await ai.aiService.getQuota()).toMatchObject({ isUnlimited: true, limit: null, remaining: null });
    await expect(ai.aiService.transcribeVoice('lunch', MEAL_TEXT)).resolves.toBeDefined();
  });

  test('hạn mức của mỗi tài khoản tách biệt', async () => {
    await newUser();
    await ai.aiService.transcribeVoice('lunch', MEAL_TEXT);

    await newUser();

    expect(await ai.aiService.getQuota()).toMatchObject({ used: 0, remaining: 5 });
  });
});
