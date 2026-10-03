/**
 * premiumService.mock + premiumStore: bản giả lập thanh toán/hủy gia hạn cho chế độ mock, và các
 * hàm thuần của store (Pro gồm cả "đã hủy gia hạn" còn hạn).
 */
type Scenario = 'success' | 'empty' | 'error' | 'slow';

function load(scenario: Scenario = 'success') {
  const scenarioRef = { value: scenario };
  jest.resetModules();
  jest.doMock('@/config/mock', () => ({ getMockDelayMs: () => 0, wait: async () => undefined }));
  jest.doMock('@/state/app/appStore', () => ({ getCurrentMockScenario: () => scenarioRef.value }));

  const { premiumMockService } =
    require('@/features/premium/services/premiumService.mock') as typeof import('@/features/premium/services/premiumService.mock');
  const store =
    require('@/state/premium/premiumStore') as typeof import('@/state/premium/premiumStore');

  return { service: premiumMockService, ...store, scenarioRef };
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 2, 12) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('premiumMockService.checkout', () => {
  test('thành công: Pro theo tháng hết hạn sau 1 tháng, ghi một giao dịch thành công đầu danh sách', async () => {
    const { service } = load();

    const result = await service.checkout('monthly', 'momo');
    const history = await service.getTransactions();

    expect(result).toMatchObject({
      amountVnd: 79000,
      planId: 'monthly',
      paymentMethodId: 'momo',
      expiresAtIso: '2026-11-02',
      membership: { status: 'premium', planId: 'monthly', expiresAtIso: '2026-11-02' },
    });
    expect(history[0]).toMatchObject({
      id: result.transactionId,
      status: 'success',
      planId: 'monthly',
      paymentMethodId: 'momo',
      amountVnd: 79000,
    });
  });

  test('gói năm hết hạn sau 1 năm, giá 699.000đ', async () => {
    const { service } = load();

    const result = await service.checkout('yearly', 'vnpay');

    expect(result.amountVnd).toBe(699000);
    expect(result.expiresAtIso).toBe('2027-10-02');
  });

  test('kịch bản lỗi: ném lỗi và không kích hoạt gói nào', async () => {
    const { service, usePremiumStore } = load('error');

    await expect(service.checkout('monthly', 'vnpay')).rejects.toThrow('Thanh toán không thành công');

    expect(usePremiumStore.getState().status).toBe('free');
  });

  test('giao dịch thất bại vẫn xuất hiện trong lịch sử khi đọc lại', async () => {
    const { service, scenarioRef } = load('error');
    await expect(service.checkout('monthly', 'vnpay')).rejects.toBeDefined();
    scenarioRef.value = 'success';

    const history = await service.getTransactions();

    expect(history[0]).toMatchObject({
      status: 'failed',
      note: 'Giao dịch không thành công, bạn chưa bị trừ tiền',
    });
  });

  test('lịch sử mẫu của design vẫn còn đủ 5 trạng thái ở cuối danh sách', async () => {
    const { service } = load();

    const history = await service.getTransactions();

    expect(history.map(item => item.status)).toEqual([
      'success',
      'failed',
      'pending',
      'cancelled',
      'expired',
    ]);
  });
});

describe('premiumMockService.cancelRenewal / getStatus / getPlans', () => {
  test('đang Premium → "đã hủy" nhưng giữ gói và hạn (vẫn dùng Pro tới hết hạn)', async () => {
    const { service, usePremiumStore } = load();
    usePremiumStore.getState().activatePremium('yearly', '2027-10-02');

    await expect(service.cancelRenewal()).resolves.toEqual({
      status: 'cancelled',
      planId: 'yearly',
      expiresAtIso: '2027-10-02',
    });
  });

  test('đang Free → không đổi gì', async () => {
    const { service } = load();

    await expect(service.cancelRenewal()).resolves.toEqual({
      status: 'free',
      planId: null,
      expiresAtIso: null,
    });
  });

  test('getStatus trả đúng trạng thái đang có trong store', async () => {
    const { service, usePremiumStore } = load();
    usePremiumStore.getState().activatePremium('monthly', '2026-11-02');

    await expect(service.getStatus()).resolves.toEqual({
      status: 'premium',
      planId: 'monthly',
      expiresAtIso: '2026-11-02',
    });
  });

  test('getPlans trả hai gói theo tháng/năm', async () => {
    const { service } = load();

    const plans = await service.getPlans();

    expect(plans.map(plan => [plan.id, plan.priceVnd])).toEqual([
      ['monthly', 79000],
      ['yearly', 699000],
    ]);
  });
});

describe('premiumStore', () => {
  test('hydrateMembership nạp đúng trạng thái; isPremiumActive/useIsPro tính cả "đã hủy gia hạn"', () => {
    const { usePremiumStore, isPremiumActive } = load();

    usePremiumStore.getState().hydrateMembership({
      status: 'cancelled',
      planId: 'monthly',
      expiresAtIso: '2026-11-02',
    });
    expect(usePremiumStore.getState()).toMatchObject({ status: 'cancelled', planId: 'monthly' });
    expect(isPremiumActive()).toBe(true);

    usePremiumStore.getState().hydrateMembership({ status: 'expired', planId: 'monthly', expiresAtIso: '2026-09-01' });
    expect(isPremiumActive()).toBe(false);
  });

  test('resetToFree xóa gói; expireMembership chuyển sang "hết hạn"', () => {
    const { usePremiumStore } = load();
    usePremiumStore.getState().activatePremium('monthly', '2026-11-02');

    usePremiumStore.getState().expireMembership();
    expect(usePremiumStore.getState()).toMatchObject({ status: 'expired', planId: null, expiresAtIso: null });

    usePremiumStore.getState().activatePremium('monthly', '2026-11-02');
    usePremiumStore.getState().resetToFree();
    expect(usePremiumStore.getState()).toMatchObject({ status: 'free', planId: null, expiresAtIso: null });
  });
});
