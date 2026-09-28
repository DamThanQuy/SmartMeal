import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { BILLING_PLAN_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../mocks/premium.mock';
import type { PaymentMethodId } from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'PaymentMethod'>;

// design/PaymentMethod.dc.html (BR-241/242). Tách khỏi PremiumScreen (Đợt 13) — chọn gói xong
// mới sang màn riêng chọn phương thức, khớp đúng luồng "Nâng cấp Pro → chọn thanh toán" trong
// artboard thay vì gộp cả 2 bước trong 1 màn như bản Đợt 8 cũ.
export function PaymentMethodScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { planId } = route.params;
  const [paymentMethodId, setPaymentMethodId] = useState<PaymentMethodId>('vnpay');

  const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);

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

        <View className="gap-sm">
          <AppText variant="bodyMedium">Chọn phương thức</AppText>
          {PAYMENT_METHOD_OPTIONS.map(method => {
            const selected = method.id === paymentMethodId;
            return (
              <Pressable
                key={method.id}
                accessibilityRole="radio"
                accessibilityLabel={method.label}
                accessibilityState={{ selected }}
                onPress={() => setPaymentMethodId(method.id)}
                className={`flex-row items-center justify-between rounded-card p-md ${
                  selected ? 'border-2 border-primary bg-primary-soft' : 'border border-border bg-surface'
                }`}
              >
                <AppText variant="body">{method.label}</AppText>
                {selected ? <Check size={20} color={colors.primary} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="gap-sm py-md">
        <AppButton
          label={`Thanh toán ${plan?.priceLabel ?? ''}`}
          onPress={() =>
            navigation.navigate(MAIN_STACK_ROUTES.PAYMENT_PENDING, { planId, paymentMethodId })
          }
        />
        <AppText variant="caption" color="secondary" className="text-center">
          Pro chỉ kích hoạt sau khi giao dịch được xác nhận.
        </AppText>
      </View>
    </ScreenContainer>
  );
}
