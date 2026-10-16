/**
 * PaymentCheckTrigger: "Tôi đã chuyển khoản" / quay lại app cắt ngắn lượt chờ giữa hai lần hỏi trạng thái thanh toán.
 */
import { PaymentCheckTrigger } from '@/features/premium/services/paymentCheckTrigger';

afterEach(() => {
  jest.useRealTimers();
});

describe('PaymentCheckTrigger', () => {
  test('không ai gọi checkNow → chờ đủ thời gian', async () => {
    jest.useFakeTimers();
    const trigger = new PaymentCheckTrigger();
    let done = false;
    void trigger.wait(3000).then(() => {
      done = true;
    });

    await jest.advanceTimersByTimeAsync(2999);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  test('checkNow kết thúc ngay mọi lượt đang chờ; gọi khi không có ai chờ thì không ảnh hưởng lượt sau', async () => {
    jest.useFakeTimers();
    const trigger = new PaymentCheckTrigger();
    trigger.checkNow();
    const finished: string[] = [];
    void trigger.wait(3000).then(() => finished.push('a'));
    void trigger.wait(3000).then(() => finished.push('b'));

    await jest.advanceTimersByTimeAsync(0);
    expect(finished).toEqual([]);
    trigger.checkNow();
    await jest.advanceTimersByTimeAsync(0);
    expect(finished).toEqual(['a', 'b']);

    // Hẹn giờ cũ đã bị hủy — hết 3 giây cũng không chạy lại.
    await jest.advanceTimersByTimeAsync(3000);
    expect(finished).toEqual(['a', 'b']);
  });
});
