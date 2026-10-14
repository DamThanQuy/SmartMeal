/**
 * aiService.mock: bản giả lập cho chế độ mock — hạn mức 5 lượt/ngày đếm cục bộ (Pro không giới hạn),
 * chỉ trừ lượt khi AI thành công (BR-233), kết quả mẫu và các kịch bản lỗi.
 */
type Scenario = 'success' | 'empty' | 'error' | 'slow';

function load(scenario: Scenario = 'success') {
  const scenarioRef = { value: scenario };
  jest.resetModules();
  jest.doMock('@/config/mock', () => ({ getMockDelayMs: () => 0, wait: async () => undefined }));
  jest.doMock('@/state/app/appStore', () => ({ getCurrentMockScenario: () => scenarioRef.value }));
  jest.doMock('@/state/resetUserData', () => ({ registerUserDataReset: jest.fn() }));

  const { aiMockService } =
    require('@/features/ai/services/aiService.mock') as typeof import('@/features/ai/services/aiService.mock');
  const { AiRecognitionFailedError } =
    require('@/features/ai/services/ai.errors') as typeof import('@/features/ai/services/ai.errors');
  const { useAiQuotaStore } =
    require('@/features/ai/state/aiQuotaStore') as typeof import('@/features/ai/state/aiQuotaStore');
  const { usePremiumStore } =
    require('@/state/premium/premiumStore') as typeof import('@/state/premium/premiumStore');

  return { service: aiMockService, AiRecognitionFailedError, useAiQuotaStore, usePremiumStore };
}

describe('getQuota', () => {
  test('Free: 5 lượt/ngày, số đã dùng đếm cục bộ', async () => {
    const { service, useAiQuotaStore } = load();
    useAiQuotaStore.setState({ usedToday: 2 });

    await expect(service.getQuota()).resolves.toMatchObject({
      isUnlimited: false,
      limit: 5,
      used: 2,
      remaining: 3,
    });
  });

  test('hết lượt → remaining = 0', async () => {
    const { service, useAiQuotaStore } = load();
    useAiQuotaStore.setState({ usedToday: 5 });

    await expect(service.getQuota()).resolves.toMatchObject({ remaining: 0 });
  });

  test('Pro (kể cả "đã hủy gia hạn" còn hạn) → không giới hạn', async () => {
    const { service, usePremiumStore } = load();
    usePremiumStore.getState().hydrateMembership({
      status: 'cancelled',
      planId: 'monthly',
      expiresAtIso: '2099-01-01',
    });

    await expect(service.getQuota()).resolves.toMatchObject({
      isUnlimited: true,
      limit: null,
      remaining: null,
    });
  });

  test('thời điểm làm mới là nửa đêm tới theo giờ máy', async () => {
    const { service } = load();

    const quota = await service.getQuota();
    const resetsAt = new Date(quota.resetsAtIso);

    expect(resetsAt.getHours()).toBe(0);
    expect(resetsAt.getMinutes()).toBe(0);
    expect(resetsAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('recordUsage / phân tích', () => {
  test('recordUsage trừ một lượt cục bộ (tối đa 5)', async () => {
    const { service, useAiQuotaStore } = load();
    useAiQuotaStore.setState({ usedToday: 4 });

    await service.recordUsage();
    await service.recordUsage();

    expect(useAiQuotaStore.getState().usedToday).toBe(5);
  });

  test('analyzeMealPhoto/transcribeVoice trả kết quả mẫu theo bữa người dùng chọn, không trừ lượt', async () => {
    const { service, useAiQuotaStore } = load();
    useAiQuotaStore.setState({ usedToday: 0 });

    const photo = await service.analyzeMealPhoto('dinner');
    const voice = await service.transcribeVoice('snack');

    expect(photo.mealType).toBe('dinner');
    expect(photo.items.length).toBeGreaterThan(0);
    expect(voice.mealType).toBe('snack');
    expect(useAiQuotaStore.getState().usedToday).toBe(0);
  });

  test.each(['empty', 'error'] as const)(
    'kịch bản %s → AiRecognitionFailedError (màn "chưa nhận diện được", không trừ lượt)',
    async scenario => {
      const { service, AiRecognitionFailedError } = load(scenario);

      await expect(service.analyzeMealPhoto('lunch')).rejects.toBeInstanceOf(AiRecognitionFailedError);
      await expect(service.transcribeVoice('lunch')).rejects.toBeInstanceOf(AiRecognitionFailedError);
    },
  );
});
