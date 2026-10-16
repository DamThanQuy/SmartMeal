import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { TransferCheckState } from '../hooks/usePaymentSession';
import { BILLING_PLAN_OPTIONS } from '../types/premium.types';

export interface PaymentScreenLayoutProps {
  title: string;
  planId: BillingPlanId;
  amountVnd: number;
  /** Dòng phụ dưới gói, vd. nội dung chuyển khoản hoặc mã đơn. */
  detail?: string;
  transferCheck: TransferCheckState;
  onConfirmTransferred: () => void;
  onChangeMethod: () => void;
  /** Phần riêng của từng phương thức (mã QR, danh sách app ngân hàng…). */
  children: React.ReactNode;
}

// Khung chung của các màn thanh toán (mở app ngân hàng, quét mã SePay, PayOS) để 3 phương thức trông và dùng giống nhau:
// thẻ gói + số tiền → phần riêng của phương thức → trạng thái đang chờ → 2 nút cố định "Tôi đã chuyển khoản" / "Đổi
// phương thức". Pro chỉ bật khi server xác nhận tiền vào (BR-241/242) — nút chỉ hỏi lại trạng thái.
export function PaymentScreenLayout({
  title,
  planId,
  amountVnd,
  detail,
  transferCheck,
  onConfirmTransferred,
  onChangeMethod,
  children,
}: PaymentScreenLayoutProps) {
  const { colors } = useTheme();
  const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);

  return (
    <ScreenContainer>
      <ScreenHeader title={title} onBack={onChangeMethod} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-md py-sm">
        <AppCard className="gap-xs">
          <AppText variant="caption" color="secondary">
            Gói đã chọn
          </AppText>
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyLg">{`SmartMeal Pro · ${plan?.label ?? ''}`}</AppText>
            <AppText variant="h3">{`${amountVnd.toLocaleString('vi-VN')}đ`}</AppText>
          </View>
          {detail ? (
            <AppText variant="caption" color="secondary">
              {detail}
            </AppText>
          ) : null}
        </AppCard>

        {children}

        <View className="flex-row items-center justify-center gap-xs">
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText variant="caption" color="secondary">
            Đang chờ nhận tiền — Pro tự kích hoạt khi tiền vào tài khoản
          </AppText>
        </View>
        {transferCheck === 'not-received' ? (
          <AppText accessibilityLiveRegion="polite" variant="caption" color="secondary" className="text-center">
            Chưa nhận được tiền. Ngân hàng có thể mất 1–2 phút — app vẫn đang chờ, bạn không cần chuyển lại.
          </AppText>
        ) : null}
      </ScrollView>

      <View className="gap-sm py-md">
        <AppButton
          label="Tôi đã chuyển khoản"
          loading={transferCheck === 'checking'}
          onPress={onConfirmTransferred}
        />
        <AppButton label="Đổi phương thức" variant="outline" onPress={onChangeMethod} />
      </View>
    </ScreenContainer>
  );
}

export interface PaymentLoadingViewProps {
  title: string;
  onBack: () => void;
}

/** Đang tạo đơn thanh toán (trước khi có mã QR / thông tin chuyển khoản). */
export function PaymentLoadingView({ title, onBack }: PaymentLoadingViewProps) {
  return (
    <ScreenContainer>
      <ScreenHeader title={title} onBack={onBack} />
      <LoadingState lines={6} />
    </ScreenContainer>
  );
}
