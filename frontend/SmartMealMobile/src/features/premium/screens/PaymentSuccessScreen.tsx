import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Check } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { BILLING_PLAN_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../mocks/premium.mock';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentSuccess'>;

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

// design/PaymentSuccess.dc.html. Premium đã được activatePremium() ở PaymentPendingScreen (sau
// khi "webhook" xác nhận) — màn này chỉ hiển thị biên nhận, không tự kích hoạt thêm lần nào.
export function PaymentSuccessScreen({ navigation, route }: Props) {
  const { result } = route.params;
  const { colors } = useTheme();
  const plan = BILLING_PLAN_OPTIONS.find(option => option.id === result.planId);
  const paymentMethod = PAYMENT_METHOD_OPTIONS.find(option => option.id === result.paymentMethodId);

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-md px-lg">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
          <Check size={34} color={colors.primary} strokeWidth={2.5} />
        </View>
        <AppText variant="h2" className="text-center">
          Thanh toán thành công
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          Chào mừng bạn đến với SmartMeal Pro. Tất cả tính năng Pro đã được mở khóa.
        </AppText>

        <AppCard className="w-full gap-xxs">
          <SummaryRow label="Gói" value={`Pro · ${plan?.label ?? ''}`} />
          <SummaryRow label="Số tiền" value={formatVnd(result.amountVnd)} />
          <SummaryRow label="Phương thức" value={paymentMethod?.label ?? ''} />
          <SummaryRow label="Mã giao dịch" value={result.transactionId} />
          <SummaryRow label="Hiệu lực đến" value={format(new Date(result.expiresAtIso), 'dd/MM/yyyy')} />
        </AppCard>

        <AppButton
          label="Bắt đầu dùng Pro"
          onPress={() =>
            navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.HOME })
          }
          className="w-full"
        />
      </View>
    </ScreenContainer>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <View className="flex-row items-center justify-between border-t border-border py-xs">
      <AppText variant="body" color="secondary">
        {label}
      </AppText>
      <AppText variant="bodyMedium">{value}</AppText>
    </View>
  );
}
