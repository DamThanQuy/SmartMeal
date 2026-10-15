import { Linking } from 'react-native';

/** Mở trang thanh toán của cổng; lỗi mở trang không chặn việc chờ xác nhận (có thể đã mở từ trước). */
export async function openPaymentPage(paymentUrl: string): Promise<void> {
  try {
    await Linking.openURL(paymentUrl);
  } catch {
    // Bỏ qua: xem chú thích ở trên.
  }
}
