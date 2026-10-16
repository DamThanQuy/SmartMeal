import { Linking, Platform } from 'react-native';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { BankTransferInfo } from '../types/premium.types';

// Mở thẳng app ngân hàng bằng link VietQR (https://www.vietqr.io/danh-sach-api/deeplink-app-ngan-hang): dl.vietqr.io
// chuyển tiếp sang app ngân hàng; app có "tự điền" nhận luôn số tài khoản/số tiền/nội dung. Đã thử thực tế: mã ngân hàng
// trong `ba` phải là mã VietQR viết thường (vd. "mb"), và `url` bắt buộc là http(s) — thiếu thì app chỉ được mở lên.

const VIETQR_DEEPLINK = 'https://dl.vietqr.io/pay';
const VIETQR_APP_ICON = 'https://cdn.vietqr.io/bank-app-icon';

/** Logo app ngân hàng trên CDN của VietQR (cùng nguồn với danh sách app). */
export function bankAppLogoUrl(appId: string): string {
  return `${VIETQR_APP_ICON}/${appId}-${Platform.OS === 'ios' ? 'ios' : 'android'}.webp`;
}

/** Trang (http) app ngân hàng mở sau khi chuyển khoản — có nút quay lại `appReturnUrl` (deep link của app). */
export function bankReturnPageUrl(appReturnUrl: string, apiBaseUrl: string = API_CONFIG.baseURL): string {
  return `${apiBaseUrl}${ENDPOINTS.subscription.paymentReturn}?to=${encodeURIComponent(appReturnUrl)}`;
}

export interface BankAppLinkInput {
  appId: string;
  transfer: BankTransferInfo;
  amountVnd: number;
  /** Trang http(s) để quay về sau khi chuyển khoản (bankReturnPageUrl). */
  returnPageUrl: string;
}

/**
 * Link dl.vietqr.io mở app ngân hàng `appId`. Biết mã VietQR của ngân hàng nhận thì kèm thông tin chuyển khoản để app có
 * "tự điền" điền sẵn; không biết thì chỉ mở app (người dùng dán nội dung đã được sao chép).
 */
export function buildBankAppLink({ appId, transfer, amountVnd, returnPageUrl }: BankAppLinkInput): string {
  const params: [string, string][] = [['app', appId]];
  if (transfer.vietQrBankCode) {
    params.push(
      ['ba', `${transfer.accountNumber}@${transfer.vietQrBankCode}`],
      ['am', String(Math.round(amountVnd))],
      ['tn', transfer.transferContent],
    );
    if (transfer.accountName) params.push(['bn', transfer.accountName]);
    params.push(['url', returnPageUrl]);
  }
  return `${VIETQR_DEEPLINK}?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}

/** Mở link (trình duyệt chuyển tiếp sang app ngân hàng; chưa cài app thì tới cửa hàng ứng dụng). false nếu không mở được. */
export async function openBankApp(link: string): Promise<boolean> {
  try {
    await Linking.openURL(link);
    return true;
  } catch {
    return false;
  }
}
