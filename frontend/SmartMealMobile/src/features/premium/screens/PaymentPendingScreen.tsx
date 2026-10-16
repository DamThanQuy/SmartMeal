import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { PaymentFailedView } from '../components/PaymentFailedView';
import { PaymentQrCode } from '../components/PaymentQrCode';
import { PaymentLoadingView, PaymentScreenLayout } from '../components/PaymentScreenLayout';
import { TransferContentNotice } from '../components/TransferContentNotice';
import { TransferDetailsCard } from '../components/TransferDetailsCard';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { usePaymentSession } from '../hooks/usePaymentSession';
import { openPaymentPage } from '../services/paymentPage';
import type { QrPaymentMethodId } from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentPending'>;

const TITLE: Record<QrPaymentMethodId, string> = {
  sepay: 'Quét mã VietQR',
  payos: 'Thanh toán PayOS',
};

// design/PaymentPending.dc.html (BR-241/242 — Payment Verification: chỉ xác thực Premium khi "Backend" xác nhận, không
// tin client-side callback). Phương thức có mã QR — SePay: quét bằng app ngân hàng trên máy khác (số tiền + nội dung điền
// sẵn) hoặc chép thông tin để chuyển tay; PayOS: quét mã hoặc mở trang PayOS (PayOS chuyển về đúng app sau khi trả).
// Dùng chung khung PaymentScreenLayout với màn mở app ngân hàng; vòng đời đơn ở usePaymentSession.
export function PaymentPendingScreen({ navigation, route }: Props) {
  const { planId, paymentMethodId } = route.params;
  const { checkout, session, transferCheck, retry, stop, confirmTransferred } = usePaymentSession(
    planId,
    paymentMethodId,
    result => navigation.replace(MAIN_STACK_ROUTES.PAYMENT_SUCCESS, { result }),
  );
  const { copiedLabel, copy } = useCopyFeedback();
  const title = TITLE[paymentMethodId];

  // Đơn vẫn còn hiệu lực ở server: trả tiền sau khi rời màn thì Pro vẫn được kích hoạt.
  const changeMethod = () => {
    stop();
    navigation.goBack();
  };

  if (checkout.isError) {
    return <PaymentFailedView message={checkout.error.message} onRetry={retry} onChangeMethod={changeMethod} />;
  }

  if (!session) {
    return <PaymentLoadingView title={title} onBack={changeMethod} />;
  }

  const transfer = session.bankTransfer;
  const detail = transfer
    ? `Nội dung chuyển khoản: ${transfer.transferContent}`
    : session.orderCode
      ? `Mã đơn #${session.orderCode}`
      : undefined;

  return (
    <PaymentScreenLayout
      title={title}
      planId={planId}
      amountVnd={session.amountVnd}
      detail={detail}
      transferCheck={transferCheck}
      onConfirmTransferred={confirmTransferred}
      onChangeMethod={changeMethod}
    >
      <AppCard className="items-center gap-sm">
        <AppText variant="caption" color="secondary" className="text-center">
          {paymentMethodId === 'sepay'
            ? 'Quét bằng app ngân hàng trên máy khác — số tiền và nội dung đã điền sẵn'
            : 'Quét mã bằng app ngân hàng, hoặc mở trang thanh toán PayOS'}
        </AppText>
        <PaymentQrCode uri={session.qrCodeUrl} accessibilityLabel={`Mã VietQR · ${title}`} />
        {paymentMethodId === 'payos' ? (
          <AppButton
            label="Mở trang thanh toán PayOS"
            variant="secondary"
            onPress={() => void openPaymentPage(session.paymentUrl)}
            className="w-full"
          />
        ) : null}
      </AppCard>

      {transfer ? (
        <>
          <TransferDetailsCard
            transfer={transfer}
            amountVnd={session.amountVnd}
            onCopy={(label, value) => void copy(label, value)}
            copiedLabel={copiedLabel}
          />
          <TransferContentNotice transfer={transfer} amountVnd={session.amountVnd} />
        </>
      ) : null}
    </PaymentScreenLayout>
  );
}
