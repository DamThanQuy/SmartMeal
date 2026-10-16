/**
 * Link mở app ngân hàng (dl.vietqr.io): đã thử thực tế với VietQR — mã ngân hàng trong `ba` phải viết thường và `url` phải
 * là http(s) thì app "tự điền" mới nhận số tài khoản/số tiền/nội dung.
 */
import { bankReturnPageUrl, buildBankAppLink } from '@/features/premium/services/bankAppLink';
import { BANK_APPS } from '@/features/premium/types/bankApp.types';
import type { BankTransferInfo } from '@/features/premium/types/premium.types';

const TRANSFER: BankTransferInfo = {
  bankCode: 'MBBank',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN A',
  transferContent: 'SM7K2P9QXA',
  expiresAtIso: null,
  vietQrBankCode: 'mb',
};

function params(link: string) {
  const [base, query] = link.split('?');
  const entries = query.split('&').map(pair => {
    const [key, value] = pair.split('=');
    return [key, decodeURIComponent(value)] as const;
  });
  return { base, values: Object.fromEntries(entries) as Record<string, string> };
}

describe('buildBankAppLink', () => {
  test('biết mã VietQR của ngân hàng nhận → kèm STK@mã, số tiền, nội dung, chủ TK và trang quay về http', () => {
    const link = buildBankAppLink({
      appId: 'icb',
      transfer: TRANSFER,
      amountVnd: 79000,
      returnPageUrl: 'http://192.168.1.5:5000/api/subscription/payment-return?to=exp%3A%2F%2Fx',
    });

    const { base, values } = params(link);
    expect(base).toBe('https://dl.vietqr.io/pay');
    expect(values).toEqual({
      app: 'icb',
      ba: '0123456789@mb',
      am: '79000',
      tn: 'SM7K2P9QXA',
      bn: 'NGUYEN VAN A',
      url: 'http://192.168.1.5:5000/api/subscription/payment-return?to=exp%3A%2F%2Fx',
    });
    expect(link).not.toContain(' ');                                // mọi tham số đều được mã hóa
  });

  test('không biết mã ngân hàng nhận → chỉ mở app (người dùng dán nội dung đã được sao chép)', () => {
    const link = buildBankAppLink({
      appId: 'vcb',
      transfer: { ...TRANSFER, vietQrBankCode: undefined },
      amountVnd: 79000,
      returnPageUrl: 'http://x',
    });

    expect(link).toBe('https://dl.vietqr.io/pay?app=vcb');
  });
});

describe('bankReturnPageUrl', () => {
  test('trang quay về trên backend, deep link của app được mã hóa trong `to`', () => {
    expect(bankReturnPageUrl('exp://192.168.1.5:8081/--/payment-result', 'http://192.168.1.5:5000/api')).toBe(
      'http://192.168.1.5:5000/api/subscription/payment-return?to=exp%3A%2F%2F192.168.1.5%3A8081%2F--%2Fpayment-result',
    );
  });
});

describe('BANK_APPS', () => {
  test('app tự điền đứng đầu danh sách, mã app không trùng', () => {
    const firstPlain = BANK_APPS.findIndex(app => !app.autofill);
    expect(BANK_APPS.slice(0, firstPlain).map(app => app.id).sort()).toEqual(['acb', 'bidv', 'icb', 'mb', 'ocb']);
    expect(BANK_APPS.slice(firstPlain).some(app => app.autofill)).toBe(false);
    expect(new Set(BANK_APPS.map(app => app.id)).size).toBe(BANK_APPS.length);
  });
});
