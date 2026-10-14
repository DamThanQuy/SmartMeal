import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, QrCode, RefreshCw, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { ENV } from '@/config/env';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useCheckoutPremium } from '../hooks/useCheckoutPremium';
import { BILLING_PLAN_OPTIONS } from '../mocks/premium.mock';
import { premiumService } from '../services/premiumService';
import type { CheckoutResult } from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentPending'>;

export function PaymentPendingScreen({ navigation, route }: Props) {
  const { planId, paymentMethodId } = route.params;
  const { colors } = useTheme();
  const checkout = useCheckoutPremium();
  const activatePremium = usePremiumStore(state => state.activatePremium);
  const addTransaction = usePremiumStore(state => state.addTransaction);
  const updateTransactionStatus = usePremiumStore(state => state.updateTransactionStatus);

  const [activeSession, setActiveSession] = useState<CheckoutResult | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const hasStarted = useRef(false);
  const pendingTxnId = useRef<string>(`txn-${Date.now()}`);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handlePaymentSuccess = (result: CheckoutResult) => {
    clearPolling();
    updateTransactionStatus(pendingTxnId.current, 'success', '');
    activatePremium(result.planId, result.expiresAtIso);
    navigation.replace(MAIN_STACK_ROUTES.PAYMENT_SUCCESS, { result });
  };

  const checkStatus = async (orderCode: number, session: CheckoutResult) => {
    try {
      setIsCheckingStatus(true);
      const res = await premiumService.checkPaymentStatus(orderCode);
      if (res.isPaid) {
        handlePaymentSuccess(session);
      }
    } catch {
      // Ignored during background polling
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const runCheckout = () => {
    clearPolling();
    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
    pendingTxnId.current = `txn-${Date.now()}`;

    addTransaction({
      id: pendingTxnId.current,
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
          if (paymentMethodId === 'payos' && result.orderCode) {
            setActiveSession(result);

            // Start polling every 3 seconds for PayOS payment confirmation
            pollIntervalRef.current = setInterval(() => {
              checkStatus(result.orderCode!, result);
            }, 3000);
          } else {
            // For non-payos methods in DEV or mock activation
            handlePaymentSuccess(result);
          }
        },
        onError: error => {
          updateTransactionStatus(pendingTxnId.current, 'failed', error.message);
        },
      },
    );
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runCheckout();

    return () => {
      clearPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    checkout.reset();
    setActiveSession(null);
    runCheckout();
  };

  const handleOpenBrowser = async () => {
    if (activeSession?.paymentUrl) {
      await WebBrowser.openBrowserAsync(activeSession.paymentUrl);
    }
  };

  if (checkout.isError) {
    return (
      <ScreenContainer contentContainerClassName="gap-lg" scroll>
        <View className="flex-1 items-center justify-center gap-sm py-xl">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-surface">
            <X size={32} color={colors.error} />
          </View>
          <AppText variant="h2" className="text-center">
            Khởi tạo thanh toán thất bại
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
            onPress={() => {
              clearPolling();
              navigation.replace(MAIN_STACK_ROUTES.PREMIUM);
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  // PayOS QR and Transfer Screen
  if (paymentMethodId === 'payos' && activeSession && activeSession.qrCodeUrl) {
    const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);

    return (
      <ScreenContainer>
        <ScreenHeader
          title="Thanh toán PayOS"
          onBack={() => {
            clearPolling();
            navigation.goBack();
          }}
        />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-md py-sm">
          <AppCard className="items-center gap-sm p-lg">
            <AppText variant="caption" color="secondary" className="uppercase tracking-wider">
              Quét mã VietQR để thanh toán
            </AppText>
            
            <View className="overflow-hidden rounded-xl bg-white p-sm border border-border">
              <Image
                source={{ uri: activeSession.qrCodeUrl }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
            </View>

            <View className="w-full flex-row items-center justify-between pt-xs border-t border-border mt-xs">
              <AppText variant="caption" color="secondary">
                Gói Pro:
              </AppText>
              <AppText variant="bodyMedium">{plan?.label}</AppText>
            </View>

            <View className="w-full flex-row items-center justify-between">
              <AppText variant="caption" color="secondary">
                Số tiền:
              </AppText>
              <AppText variant="h3" color="primary">
                {`${activeSession.amountVnd.toLocaleString('vi-VN')} đ`}
              </AppText>
            </View>

            {activeSession.orderCode ? (
              <View className="w-full flex-row items-center justify-between">
                <AppText variant="caption" color="secondary">
                  Mã đơn hàng:
                </AppText>
                <AppText variant="caption" color="primary">
                  {`#${activeSession.orderCode}`}
                </AppText>
              </View>
            ) : null}
          </AppCard>

          <View className="items-center justify-center flex-row gap-xs py-xs">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" color="secondary">
              Đang chờ giao dịch... Tự động kích hoạt khi nhận tiền
            </AppText>
          </View>

          <View className="gap-sm">
            <AppButton
              label="Mở cổng thanh toán PayOS"
              onPress={handleOpenBrowser}
            />

            <AppButton
              label={isCheckingStatus ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản'}
              variant="secondary"
              onPress={() => activeSession.orderCode && checkStatus(activeSession.orderCode, activeSession)}
            />

            <AppButton
              label="Đổi phương thức thanh toán"
              variant="outline"
              onPress={() => {
                clearPolling();
                navigation.replace(MAIN_STACK_ROUTES.PREMIUM);
              }}
            />
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
          Đang khởi tạo thanh toán…
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          Vui lòng đợi giây lát trong khi chúng tôi kết nối tới cổng thanh toán.
        </AppText>
      </View>
    </ScreenContainer>
  );
}
