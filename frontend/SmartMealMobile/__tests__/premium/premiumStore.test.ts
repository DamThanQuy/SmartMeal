/**
 * premiumStore: trạng thái gói do server báo (hydrateMembership) và các hàm thuần (Pro gồm cả "đã hủy
 * gia hạn" còn hạn).
 */
import { isProMembership, usePremiumStore } from '@/state/premium/premiumStore';

const PRO_MONTHLY = { status: 'premium', planId: 'monthly', expiresAtIso: '2026-11-02' } as const;

beforeEach(() => {
  usePremiumStore.getState().resetToFree();
});

describe('premiumStore', () => {
  test('hydrateMembership nạp đúng trạng thái; Pro tính cả "đã hủy gia hạn"', () => {
    usePremiumStore.getState().hydrateMembership({
      status: 'cancelled',
      planId: 'monthly',
      expiresAtIso: '2026-11-02',
    });
    expect(usePremiumStore.getState()).toMatchObject({ status: 'cancelled', planId: 'monthly' });
    expect(isProMembership(usePremiumStore.getState().status)).toBe(true);

    usePremiumStore.getState().hydrateMembership({ status: 'expired', planId: 'monthly', expiresAtIso: '2026-09-01' });
    expect(isProMembership(usePremiumStore.getState().status)).toBe(false);
  });

  test('resetToFree xóa gói; expireMembership chuyển sang "hết hạn"', () => {
    usePremiumStore.getState().hydrateMembership(PRO_MONTHLY);

    usePremiumStore.getState().expireMembership();
    expect(usePremiumStore.getState()).toMatchObject({ status: 'expired', planId: null, expiresAtIso: null });

    usePremiumStore.getState().hydrateMembership(PRO_MONTHLY);
    usePremiumStore.getState().resetToFree();
    expect(usePremiumStore.getState()).toMatchObject({ status: 'free', planId: null, expiresAtIso: null });
  });
});
