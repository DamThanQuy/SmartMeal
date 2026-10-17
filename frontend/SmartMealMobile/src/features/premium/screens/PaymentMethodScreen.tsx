import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QrCode, Smartphone, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useSubscriptionPlans } from '../hooks/useSubscription';
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodOption,
  type SelectablePaymentMethodId,
} from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentMethod'>;

const METHOD_ICON: Record<SelectablePaymentMethodId, (color: string) => React.ReactNode> = {
  bank_app: color => <Smartphone size={20} color={color} />,
  sepay: color => <QrCode size={20} color={color} />,
  payos: color => <Wallet size={20} color={color} />,
};

interface PaymentMethodRowProps {
  method: PaymentMethodOption;
  selected: boolean;
  onSelect: () => void;
}

function PaymentMethodRow({ method, selected, onSelect }: PaymentMethodRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={method.label}
      accessibilityHint={method.description}
      accessibilityState={{ selected }}
      onPress={onSelect}
      className={`flex-row items-center gap-sm rounded-card p-md ${
        selected ? 'border-2 border-primary bg-primary-soft' : 'border border-border bg-surface'
      }`}
    >
      <View
        className={`h-[40px] w-[40px] items-center justify-center rounded-md ${selected ? 'bg-surface' : 'bg-primary-soft'}`}
      >
        {METHOD_ICON[method.id](colors.primary)}
      </View>
      <View className="flex-1 gap-xxs">
        <View className="flex-row flex-wrap items-center gap-xs">
          <AppText variant="bodyMedium">{method.label}</AppText>
          {method.recommended ? <AppBadge label="Đề xuất" /> : null}
        </View>
        <AppText variant="caption" color="secondary">
          {method.description}
        </AppText>
      </View>
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
          selected ? 'border-primary' : 'border-border'
        }`}
      >
        {selected ? <View className="h-[10px] w-[10px] rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}

// design/PaymentMethod.dc.html (BR-241/242). Tách khỏi PremiumScreen (Đợt 13) — chọn gói xong mới sang màn riêng chọn
// phương thức. 3 phương thức cùng một kiểu ô chọn, chọn rồi bấm "Thanh toán": "Mở app ngân hàng" (đề xuất, chọn sẵn —
// trên điện thoại không quét được QR trên chính màn hình) → BankApp; quét mã SePay / PayOS → PaymentPending.
export function PaymentMethodScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const { data: plans, isLoading, isError, error, refetch } = useSubscriptionPlans();
  const [paymentMethodId, setPaymentMethodId] = useState<SelectablePaymentMethodId>(PAYMENT_METHOD_OPTIONS[0].id);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Phương thức thanh toán" onBack={() => navigation.goBack()} />
        <LoadingState lines={4} />
      </ScreenContainer>
    );
  }

  if (isError || !plans) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Phương thức thanh toán" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const plan = plans.find(option => option.id === planId);

  const pay = () => {
    if (paymentMethodId === 'bank_app') {
      navigation.navigate(MAIN_STACK_ROUTES.BANK_APP, { planId });
      return;
    }
    navigation.navigate(MAIN_STACK_ROUTES.PAYMENT_PENDING, { planId, paymentMethodId });
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Phương thức thanh toán" onBack={() => navigation.goBack()} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-sm">
        <AppCard className="gap-xs">
          <AppText variant="caption" color="secondary">
            Gói đã chọn
          </AppText>
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyLg">{`SmartMeal Pro · ${plan?.label ?? ''}`}</AppText>
            <AppText variant="h3">{plan?.priceLabel ?? ''}</AppText>
          </View>
          <AppText variant="caption" color="secondary">
            {plan?.billingLabel ?? ''}
          </AppText>
        </AppCard>

        <View accessibilityRole="radiogroup" className="gap-sm">
          <AppText variant="bodyMedium">Chọn phương thức</AppText>
          {PAYMENT_METHOD_OPTIONS.map(method => (
            <PaymentMethodRow
              key={method.id}
              method={method}
              selected={method.id === paymentMethodId}
              onSelect={() => setPaymentMethodId(method.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="gap-sm py-md">
        <AppButton label={`Thanh toán ${plan?.priceLabel ?? ''}`} onPress={pay} />
        <AppText variant="caption" color="secondary" className="text-center">
          Pro chỉ kích hoạt sau khi giao dịch được xác nhận.
        </AppText>
      </View>
    </ScreenContainer>
  );
}
