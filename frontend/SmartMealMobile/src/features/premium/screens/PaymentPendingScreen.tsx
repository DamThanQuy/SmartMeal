import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useCheckoutPremium } from '../hooks/useCheckoutPremium';
import { BILLING_PLAN_OPTIONS } from '../mocks/premium.mock';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentPending'>;

// design/PaymentPending.dc.html (BR-241/242 — Payment Verification: chỉ xác thực Premium khi
// "Backend" (mock: sau khi Promise checkout resolve) xác nhận, không tin client-side callback
// nên activatePremium() chỉ gọi ở đây, không gọi ngay lúc bấm "Nâng cấp Pro" ở PremiumScreen).
// Đợt 13: mỗi lần chạy (kể cả bấm "Thử lại") tạo 1 dòng trong SubscriptionScreen "Lịch sử giao
// dịch" — pending lúc bắt đầu, cập nhật success/failed khi checkout() resolve/reject.
export function PaymentPendingScreen({ navigation, route }: Props) {
  const { planId, paymentMethodId } = route.params;
  const { colors } = useTheme();
  const checkout = useCheckoutPremium();
  const activatePremium = usePremiumStore(state => state.activatePremium);
  const addTransaction = usePremiumStore(state => state.addTransaction);
  const updateTransactionStatus = usePremiumStore(state => state.updateTransactionStatus);
  const hasStarted = useRef(false);

  const runCheckout = () => {
    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
    const pendingId = `txn-${Date.now()}`;
    addTransaction({
      id: pendingId,
      planId,
      paymentMethodId,
      amountVnd: plan?.priceVnd ?? 0,
      status: 'pending',
      createdAtIso: new Date().toISOString(),
      note: 'Pro chỉ kích hoạt sau khi giao dịch được xác nhận',
    });

    checkout.mutate(
      { planId, paymentMethodId },
      {
        onSuccess: result => {
          updateTransactionStatus(pendingId, 'success', '');
          activatePremium(result.planId, result.expiresAtIso);
          navigation.replace(MAIN_STACK_ROUTES.PAYMENT_SUCCESS, { result });
        },
        onError: error => {
          updateTransactionStatus(pendingId, 'failed', error.message);
        },
      },
    );
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy 1 lần lúc mount, tránh gọi lại checkout khi mutation state đổi.
  }, []);

  const handleRetry = () => {
    checkout.reset();
    runCheckout();
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
          <AppButton
            label="Đổi phương thức"
            variant="outline"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.PREMIUM)}
          />
        </View>
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
