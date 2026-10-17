/**
 * Đánh thức vòng chờ xác nhận thanh toán để hỏi trạng thái ngay thay vì đợi tới nhịp kế tiếp — dùng khi người dùng bấm
 * "Tôi đã chuyển khoản" hoặc vừa quay lại SmartMeal từ app ngân hàng. Không tự kích hoạt gì: Pro vẫn chỉ bật khi server
 * xác nhận đã nhận tiền (BR-241).
 */
export class PaymentCheckTrigger {
  private readonly wakers = new Set<() => void>();

  /** Chờ `ms` mili giây, hoặc ngắn hơn nếu `checkNow()` được gọi trong lúc chờ. */
  wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      const wake = () => {
        clearTimeout(timer);
        this.wakers.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, ms);
      this.wakers.add(wake);
    });
  }

  /** Kết thúc ngay mọi lượt chờ đang dở; đang hỏi dở thì kết quả của lượt đó trả về như bình thường. */
  checkNow(): void {
    [...this.wakers].forEach(wake => wake());
  }
}
