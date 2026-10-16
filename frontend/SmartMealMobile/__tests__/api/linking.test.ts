/**
 * Deep link: PayOS chuyển về `payment-result` sau khi thanh toán — app chỉ cần mở lại, KHÔNG điều hướng (màn chờ xác nhận
 * tự hỏi trạng thái khi quay lại). Các link khác (bộ sưu tập chia sẻ) vẫn mở đúng màn.
 */
import { isPaymentReturnPath, linking } from '@/navigation/linking';

describe('isPaymentReturnPath', () => {
  test('nhận payment-result kèm hoặc không kèm "/" và tham số PayOS gắn thêm', () => {
    expect(isPaymentReturnPath('payment-result')).toBe(true);
    expect(isPaymentReturnPath('/payment-result')).toBe(true);
    expect(isPaymentReturnPath('payment-result?code=00&cancel=false&status=PAID&orderCode=1')).toBe(true);
  });

  test('đường dẫn khác không bị chặn', () => {
    expect(isPaymentReturnPath('payment-results')).toBe(false);
    expect(isPaymentReturnPath('shared/collections/abc')).toBe(false);
  });
});

describe('linking.getStateFromPath', () => {
  const options = linking.config as Parameters<NonNullable<typeof linking.getStateFromPath>>[1];

  test('PayOS chuyển về → không có state điều hướng (giữ nguyên màn đang chờ)', () => {
    expect(linking.getStateFromPath?.('payment-result?status=PAID&cancel=false', options)).toBeUndefined();
  });

  test('liên kết chia sẻ bộ sưu tập vẫn mở đúng màn', () => {
    const state = linking.getStateFromPath?.('shared/collections/tok123', options);

    expect(JSON.stringify(state)).toContain('SharedCollection');
    expect(JSON.stringify(state)).toContain('tok123');
  });
});
