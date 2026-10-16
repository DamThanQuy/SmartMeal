import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import { DEEP_LINK_PATHS } from '@/constants/routes';

/**
 * Deep link để PayOS chuyển về app sau khi thanh toán/hủy: smartmealmobile://payment-result, trên Expo Go là
 * exp://<máy chạy Metro>/--/payment-result (createURL tự chọn đúng dạng).
 */
export function paymentReturnUrl(): string {
  return ExpoLinking.createURL(DEEP_LINK_PATHS.PAYMENT_RETURN);
}

/** Mở trang thanh toán của cổng; lỗi mở trang không chặn việc chờ xác nhận (có thể đã mở từ trước). */
export async function openPaymentPage(paymentUrl: string): Promise<void> {
  try {
    await Linking.openURL(paymentUrl);
  } catch {
    // Bỏ qua: xem chú thích ở trên.
  }
}
