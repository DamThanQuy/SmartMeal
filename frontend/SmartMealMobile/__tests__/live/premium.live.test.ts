/**
 * Live: gói thành viên với backend thật — bảng giá, trạng thái, thanh toán (kích hoạt thử ở Development),
 * lịch sử giao dịch, hủy gia hạn (vẫn dùng Pro tới hết hạn) và gia hạn khi còn hạn (cộng dồn thời gian).
 * Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type PremiumModule = typeof import('@/features/premium/services/premiumService');
type StoreModule = typeof import('@/state/auth/authStore');
type DateModule = typeof import('@/utils/date');

describeLive('gói thành viên (backend thật)', () => {
  let authService: AuthModule['authService'];
  let premiumService: PremiumModule['premiumService'];
  let useAuthStore: StoreModule['useAuthStore'];
  let dates: DateModule;

  beforeAll(() => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ premiumService } = require('@/features/premium/services/premiumService') as PremiumModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as StoreModule);
    dates = require('@/utils/date') as DateModule;
  });

  async function newUser() {
    const email = uniqueEmail('premium');
    const { user } = await authService.register({ fullName: 'Người Thử', email, password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    return user;
  }

  /** Ngày "yyyy-MM-dd" theo giờ máy sau `days` ngày kể từ hôm nay. */
  function inDays(days: number): string {
    return dates.addDaysIso(dates.todayIso(), days);
  }

  test('bảng giá do BE quyết định: tháng 79.000đ, năm 699.000đ', async () => {
    await newUser();

    const plans = await premiumService.getPlans();

    expect(plans.map(plan => [plan.id, plan.priceVnd, plan.priceLabel])).toEqual([
      ['monthly', 79000, '79.000đ'],
      ['yearly', 699000, '699.000đ'],
    ]);
  });

  test('tài khoản mới: Free, chưa có giao dịch nào', async () => {
    await newUser();

    await expect(premiumService.getStatus()).resolves.toEqual({
      status: 'free',
      planId: null,
      expiresAtIso: null,
    });
    await expect(premiumService.getTransactions()).resolves.toEqual([]);
  });

  test('thanh toán gói tháng (Development): server kích hoạt Pro 30 ngày và ghi lịch sử', async () => {
    await newUser();

    const result = await premiumService.checkout('monthly', 'vnpay');
    const status = await premiumService.getStatus();
    const history = await premiumService.getTransactions();

    expect(result).toMatchObject({ amountVnd: 79000, planId: 'monthly', paymentMethodId: 'vnpay' });
    expect(result.transactionId).toMatch(/^SES_/);
    expect(status).toMatchObject({ status: 'premium', planId: 'monthly' });
    expect(status.expiresAtIso).toBe(inDays(30));
    expect(result.membership).toEqual(status);
    // Phiên thanh toán (đang chờ) và giao dịch kích hoạt thử (đã thanh toán).
    expect(history.map(item => [item.status, item.paymentMethodId]).sort()).toEqual([
      ['pending', 'vnpay'],
      ['success', 'mock'],
    ]);
    expect(history.every(item => item.planId === 'monthly' && item.amountVnd === 79000)).toBe(true);
  });

  test('hủy gia hạn: vẫn là Pro tới hết hạn (giữ gói và hạn), hủy lần nữa khi chưa có Pro bị từ chối', async () => {
    await newUser();
    await expect(premiumService.cancelRenewal()).rejects.toMatchObject({
      code: 'BUSINESS',
      message: expect.stringContaining('chưa có gói Pro'),
    });
    await premiumService.checkout('yearly', 'momo');
    const before = await premiumService.getStatus();

    const cancelled = await premiumService.cancelRenewal();

    expect(before).toMatchObject({ status: 'premium', planId: 'yearly' });
    expect(cancelled).toEqual({ ...before, status: 'cancelled' });
    expect(await premiumService.getStatus()).toEqual(cancelled);
  });

  test('gia hạn khi còn hạn cộng thêm vào cuối kỳ hiện tại, không tính lại từ hôm nay', async () => {
    await newUser();
    await premiumService.checkout('monthly', 'vnpay');
    const first = await premiumService.getStatus();

    const renewed = await premiumService.checkout('monthly', 'vnpay');

    expect(first.expiresAtIso).toBe(inDays(30));
    expect(renewed.expiresAtIso).toBe(inDays(60));
    expect((await premiumService.getStatus()).expiresAtIso).toBe(inDays(60));
  });

  test('gia hạn sau khi đã hủy gia hạn: gói Premium trở lại', async () => {
    await newUser();
    await premiumService.checkout('monthly', 'vnpay');
    await premiumService.cancelRenewal();

    await premiumService.checkout('monthly', 'card');

    expect(await premiumService.getStatus()).toMatchObject({ status: 'premium', expiresAtIso: inDays(60) });
  });

  test('gói của mỗi tài khoản tách biệt', async () => {
    await newUser();
    await premiumService.checkout('monthly', 'vnpay');

    await newUser();

    await expect(premiumService.getStatus()).resolves.toMatchObject({ status: 'free' });
    await expect(premiumService.getTransactions()).resolves.toEqual([]);
  });
});
