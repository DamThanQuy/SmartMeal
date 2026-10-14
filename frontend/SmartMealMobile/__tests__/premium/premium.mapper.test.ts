/**
 * premium.mapper (docs/fetch-api/part1 §13): quy đổi DTO /subscription/* ↔ type FE. Fixture khớp
 * DTO C# (JSON camelCase).
 */
import {
  fromApiPaymentMethod,
  fromApiPlanId,
  fromPlanDto,
  fromStatusDto,
  fromTransactionDto,
  toApiPaymentMethod,
  toApiPlanId,
} from '@/features/premium/services/premium.mapper';
import type {
  PaymentTransactionDto,
  SubscriptionPlanDto,
  SubscriptionStatusDto,
} from '@/features/premium/types/premium.api.types';
import { isProMembership } from '@/state/premium/premiumStore';

describe('mã gói và phương thức thanh toán', () => {
  test('gói FE ↔ id của BE, không phân biệt hoa/thường, gói lạ → null', () => {
    expect(toApiPlanId('monthly')).toBe('PRO_MONTHLY');
    expect(toApiPlanId('yearly')).toBe('PRO_YEARLY');
    expect(fromApiPlanId('PRO_YEARLY')).toBe('yearly');
    expect(fromApiPlanId(' pro_monthly ')).toBe('monthly');
    expect(fromApiPlanId('PRO_LIFETIME')).toBeNull();
    expect(fromApiPlanId(null)).toBeNull();
  });

  test('phương thức FE ↔ BE; MOCK (kích hoạt thử) → "mock"; giá trị lạ → mặc định VNPAY', () => {
    expect(toApiPaymentMethod('vnpay')).toBe('VNPAY');
    expect(toApiPaymentMethod('momo')).toBe('MOMO');
    expect(toApiPaymentMethod('card')).toBe('STRIPE');
    expect(fromApiPaymentMethod('STRIPE')).toBe('card');
    expect(fromApiPaymentMethod('momo')).toBe('momo');
    expect(fromApiPaymentMethod('MOCK')).toBe('mock');
    expect(fromApiPaymentMethod('PAYPAL')).toBe('vnpay');
  });
});

describe('fromPlanDto', () => {
  const plan: SubscriptionPlanDto = {
    id: 'PRO_YEARLY',
    name: 'Gói Năm (Pro Yearly - Tiết kiệm 25%)',
    priceVnd: 699000,
    billingCycle: 'Yearly',
    features: ['…'],
    isPopular: true,
  };

  test('giá do BE quyết định, nhãn theo chu kỳ (không dùng tên dài của BE)', () => {
    expect(fromPlanDto(plan)).toEqual({
      id: 'yearly',
      label: 'Theo năm',
      priceLabel: '699.000đ',
      billingLabel: 'Thanh toán mỗi năm',
      priceVnd: 699000,
    });
    expect(fromPlanDto({ ...plan, id: 'PRO_MONTHLY', priceVnd: 79000 })).toMatchObject({
      id: 'monthly',
      label: 'Theo tháng',
      priceLabel: '79.000đ',
    });
  });

  test('gói chưa có trong FE bị bỏ', () => {
    expect(fromPlanDto({ ...plan, id: 'PRO_LIFETIME' })).toBeNull();
  });
});

describe('fromStatusDto', () => {
  const dto = (overrides: Partial<SubscriptionStatusDto> = {}): SubscriptionStatusDto => ({
    status: 'Premium',
    isPro: true,
    planId: 'PRO_MONTHLY',
    proExpiresAt: '2026-11-02T10:00:00Z',
    ...overrides,
  });

  test('Premium: gói và ngày hết hạn theo giờ máy', () => {
    const expected = new Date('2026-11-02T10:00:00Z');
    const localDate = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;

    expect(fromStatusDto(dto())).toEqual({
      status: 'premium',
      planId: 'monthly',
      expiresAtIso: localDate,
    });
  });

  test.each([
    ['Free', 'free'],
    ['Premium', 'premium'],
    ['Expired', 'expired'],
    ['Cancelled', 'cancelled'],
    ['premium', 'premium'],
    ['Gì đó lạ', 'free'],
  ] as const)('trạng thái "%s" → %s', (status, expected) => {
    expect(fromStatusDto(dto({ status })).status).toBe(expected);
  });

  test('chưa từng có gói → không gói, không hạn', () => {
    expect(fromStatusDto(dto({ status: 'Free', isPro: false, planId: null, proExpiresAt: null }))).toEqual({
      status: 'free',
      planId: null,
      expiresAtIso: null,
    });
  });

  test('ngày hết hạn hỏng → không có hạn thay vì làm hỏng cả trạng thái', () => {
    expect(fromStatusDto(dto({ proExpiresAt: 'khong-phai-ngay' })).expiresAtIso).toBeNull();
  });
});

describe('isProMembership', () => {
  test('Premium và "đã hủy gia hạn" còn dùng được Pro; Free và hết hạn thì không', () => {
    expect(isProMembership('premium')).toBe(true);
    expect(isProMembership('cancelled')).toBe(true);
    expect(isProMembership('free')).toBe(false);
    expect(isProMembership('expired')).toBe(false);
  });
});

describe('fromTransactionDto', () => {
  const transaction = (overrides: Partial<PaymentTransactionDto> = {}): PaymentTransactionDto => ({
    id: 'tx-1',
    sessionId: 'SES_1',
    planId: 'PRO_MONTHLY',
    amountVnd: 79000,
    paymentMethod: 'VNPAY',
    status: 'Paid',
    createdAt: '2026-10-02T03:00:00Z',
    paidAt: '2026-10-02T03:01:00Z',
    ...overrides,
  });

  test('Paid → thành công, không ghi chú', () => {
    expect(fromTransactionDto(transaction())).toEqual({
      id: 'tx-1',
      planId: 'monthly',
      paymentMethodId: 'vnpay',
      amountVnd: 79000,
      status: 'success',
      createdAtIso: '2026-10-02T03:00:00.000Z',
      note: undefined,
    });
  });

  test('Pending → đang chờ kèm ghi chú "chỉ kích hoạt sau khi xác nhận" (BR-241/242)', () => {
    expect(fromTransactionDto(transaction({ status: 'Pending', paidAt: null }))).toMatchObject({
      status: 'pending',
      note: 'Pro chỉ kích hoạt sau khi giao dịch được xác nhận',
    });
  });

  test('Failed → thất bại kèm ghi chú "chưa bị trừ tiền"; trạng thái lạ coi là đang chờ', () => {
    expect(fromTransactionDto(transaction({ status: 'Failed' }))).toMatchObject({
      status: 'failed',
      note: 'Giao dịch không thành công, bạn chưa bị trừ tiền',
    });
    expect(fromTransactionDto(transaction({ status: 'Refunded' }))?.status).toBe('pending');
  });

  test('giao dịch kích hoạt thử (MOCK) hiện đúng phương thức; gói lạ bị bỏ', () => {
    expect(fromTransactionDto(transaction({ paymentMethod: 'MOCK' }))?.paymentMethodId).toBe('mock');
    expect(fromTransactionDto(transaction({ planId: 'PRO_LIFETIME' }))).toBeNull();
  });

  test('thời điểm tạo thiếu múi giờ vẫn được hiểu là UTC', () => {
    expect(
      fromTransactionDto(transaction({ createdAt: '2026-10-02T03:00:00' }))?.createdAtIso,
    ).toBe('2026-10-02T03:00:00.000Z');
  });
});
