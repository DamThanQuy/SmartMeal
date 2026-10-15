import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { QrCode, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useCheckoutPremium } from '../hooks/useCheckoutPremium';
import { BILLING_PLAN_OPTIONS } from '../mocks/premium.mock';
import { openPaymentPage } from '../services/paymentPage';
import type { CheckoutSession } from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentPending'>;

const QR_SIZE = 220;

interface TransferRowProps {
  label: string;
  value: string;
  /** Nhấn giữ để sao chép (số tài khoản, nội dung chuyển khoản). */
  copyable?: boolean;
  emphasize?: boolean;
}

function TransferRow({ label, value, copyable = false, emphasize = false }: TransferRowProps) {
  return (
    <View className="w-full flex-row items-center justify-between gap-sm">
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText
        variant={emphasize ? 'h3' : 'bodyMedium'}
        color={emphasize ? 'onPrimarySoft' : 'primary'}
        selectable={copyable}
        className="flex-shrink text-right"
      >
        {value}
      </AppText>
    </View>
  );
}

// design/PaymentPending.dc.html (BR-241/242 — Payment Verification: chỉ xác thực Premium khi
// "Backend" xác nhận, không tin client-side callback). Màn này chỉ bắt đầu thanh toán rồi chờ
// premiumService.checkout() trả về — service tạo phiên, chờ server xác nhận (đọc lại trạng thái gói)
// và hook useCheckoutPremium nạp gói mới vào store. Với PayOS, trong lúc chờ màn hình hiện mã VietQR +
// nút mở trang PayOS (phiên nhận qua onSession); server tự hỏi PayOS nên không cần nút "Tôi đã chuyển".
// Rời màn hình thì dừng chờ (AbortController) — giao dịch vẫn được kích hoạt ở server nếu PayOS xác nhận sau.
export function PaymentPendingScreen({ navigation, route }: Props) {
  const { planId, paymentMethodId } = route.params;
  const { colors } = useTheme();
  const checkout = useCheckoutPremium();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const hasStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const runCheckout = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSession(null);
    checkout.mutate(
      { planId, paymentMethodId, onSession: setSession, signal: controller.signal },
      {
        onSuccess: result => {
          navigation.replace(MAIN_STACK_ROUTES.PAYMENT_SUCCESS, { result });
        },
      },
    );
  };

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      runCheckout();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy 1 lần lúc mount, tránh gọi lại checkout khi mutation state đổi.
  }, []);

  const handleRetry = () => {
    checkout.reset();
    runCheckout();
  };

  const changeMethod = () => {
    abortRef.current?.abort();
    navigation.replace(MAIN_STACK_ROUTES.PREMIUM);
  };

  if (checkout.isError) {
    return (
      <ScreenContainer contentContainerClassName="gap-lg" scroll>
        <View className="flex-1 items-center justify-center gap-sm py-xl">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-surface">
            <X size={32} color={colors.error} />
          </View>
          <AppText variant="h2" className="text-center">
            Thanh toán thất bại
          </AppText>
          <AppText variant="body" color="secondary" className="text-center">
            {checkout.error.message}
          </AppText>
        </View>
        <View className="gap-sm">
          <AppButton label="Thử lại" onPress={handleRetry} />
          <AppButton label="Đổi phương thức" variant="outline" onPress={changeMethod} />
        </View>
      </ScreenContainer>
    );
  }

  // SePay: chuyển khoản thẳng vào tài khoản ngân hàng — quét QR (số tiền + nội dung điền sẵn) hoặc chuyển tay đúng nội dung.
  // Server xác nhận khi SePay báo tiền vào (webhook) hoặc khi tự hỏi API giao dịch của SePay.
  if (session?.bankTransfer) {
    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
    const transfer = session.bankTransfer;
    const expiresAt = transfer.expiresAtIso ? format(new Date(transfer.expiresAtIso), 'HH:mm') : null;
    return (
      <ScreenContainer>
        <ScreenHeader title="Chuyển khoản ngân hàng" onBack={changeMethod} />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-md py-sm">
          <AppCard className="items-center gap-sm">
            <AppText variant="caption" color="secondary" className="text-center">
              Quét mã VietQR bằng ứng dụng ngân hàng — số tiền và nội dung đã được điền sẵn
            </AppText>
            {session.qrCodeUrl ? (
              <View className="overflow-hidden rounded-md border border-border bg-surface p-xs">
                <Image
                  source={{ uri: session.qrCodeUrl }}
                  accessibilityLabel="Mã VietQR chuyển khoản"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                className="items-center justify-center rounded-md bg-primary-soft"
                style={{ width: QR_SIZE, height: QR_SIZE }}
              >
                <QrCode size={64} color={colors.primary} />
              </View>
            )}
            <View className="w-full gap-xs border-t border-border pt-xs">
              <TransferRow label="Gói" value={plan?.label ?? ''} />
              <TransferRow label="Số tiền" value={`${session.amountVnd.toLocaleString('vi-VN')}đ`} emphasize />
              <TransferRow label="Ngân hàng" value={transfer.bankCode} />
              <TransferRow label="Số tài khoản" value={transfer.accountNumber} copyable />
              {transfer.accountName ? <TransferRow label="Chủ tài khoản" value={transfer.accountName} /> : null}
              <TransferRow label="Nội dung chuyển khoản" value={transfer.transferContent} copyable emphasize />
            </View>
          </AppCard>

          <AppText variant="caption" color="secondary" className="text-center">
            {`Chuyển tay thì ghi ĐÚNG nội dung ${transfer.transferContent} để hệ thống tự nhận ra. Nhấn giữ số tài khoản hoặc nội dung để sao chép.`}
            {expiresAt ? ` Mã QR dùng đến ${expiresAt}.` : ''}
          </AppText>

          <View className="flex-row items-center justify-center gap-xs">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" color="secondary">
              Đang chờ nhận tiền — Pro tự kích hoạt khi tiền vào tài khoản
            </AppText>
          </View>

          <AppButton label="Đổi phương thức" variant="outline" onPress={changeMethod} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (paymentMethodId === 'payos' && session) {
    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
    return (
      <ScreenContainer>
        <ScreenHeader title="Thanh toán PayOS" onBack={changeMethod} />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-md py-sm">
          <AppCard className="items-center gap-sm">
            <AppText variant="caption" color="secondary" className="text-center">
              Quét mã VietQR bằng ứng dụng ngân hàng để chuyển khoản
            </AppText>
            {session.qrCodeUrl ? (
              <View className="overflow-hidden rounded-md border border-border bg-surface p-xs">
                <Image
                  source={{ uri: session.qrCodeUrl }}
                  accessibilityLabel="Mã VietQR thanh toán"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                className="items-center justify-center rounded-md bg-primary-soft"
                style={{ width: QR_SIZE, height: QR_SIZE }}
              >
                <QrCode size={64} color={colors.primary} />
              </View>
            )}
            <View className="w-full flex-row items-center justify-between border-t border-border pt-xs">
              <AppText variant="caption" color="secondary">
                Gói
              </AppText>
              <AppText variant="bodyMedium">{plan?.label ?? ''}</AppText>
            </View>
            <View className="w-full flex-row items-center justify-between">
              <AppText variant="caption" color="secondary">
                Số tiền
              </AppText>
              <AppText variant="h3">{`${session.amountVnd.toLocaleString('vi-VN')}đ`}</AppText>
            </View>
            {session.orderCode ? (
              <View className="w-full flex-row items-center justify-between">
                <AppText variant="caption" color="secondary">
                  Mã đơn
                </AppText>
                <AppText variant="caption">{`#${session.orderCode}`}</AppText>
              </View>
            ) : null}
          </AppCard>

          <View className="flex-row items-center justify-center gap-xs">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" color="secondary">
              Đang chờ PayOS xác nhận — Pro tự kích hoạt khi nhận được tiền
            </AppText>
          </View>

          <View className="gap-sm">
            <AppButton label="Mở trang thanh toán PayOS" onPress={() => void openPaymentPage(session.paymentUrl)} />
            <AppButton label="Đổi phương thức" variant="outline" onPress={changeMethod} />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-sm px-xl">
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="h2" className="mt-sm text-center">
          Đang xác nhận giao dịch…
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          Pro sẽ được kích hoạt ngay khi cổng thanh toán xác nhận. Vui lòng không đóng ứng dụng.
        </AppText>
      </View>
    </ScreenContainer>
  );
}
