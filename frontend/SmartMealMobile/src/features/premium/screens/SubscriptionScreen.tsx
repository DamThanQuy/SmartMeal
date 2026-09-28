import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Check, Info, Sparkles } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppSwitch, AppText } from '@/components/ui';
import type { AppBadgeTone } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import {
  TRANSACTION_STATUS_LABEL,
  usePremiumStore,
  type TransactionStatus,
} from '@/state/premium/premiumStore';
import { useTheme } from '@/theme/ThemeProvider';
import { BILLING_PLAN_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../mocks/premium.mock';
import { MEMBERSHIP_BADGE_LABEL } from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Subscription'>;

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

const TRANSACTION_TONE: Record<TransactionStatus, AppBadgeTone> = {
  success: 'primary',
  pending: 'info',
  failed: 'error',
  cancelled: 'neutral',
  expired: 'warning',
};

const PRO_BENEFITS = [
  'AI Snap và Voice không giới hạn',
  'Fridge Scanner',
  'Meal Plan nâng cao',
  'Gợi ý theo bệnh lý',
];

// design/Subscription.dc.html (BR-230→233, BR-241/242, BR-271). Đọc thẳng từ premiumStore hiện
// có — xử lý đủ 4 trạng thái Free/Premium/Expired/Cancelled, không chỉ riêng Premium. Lịch sử
// giao dịch + trạng thái gói KHÔNG bị xóa bởi DeleteDataScreen (BR-271).
export function SubscriptionScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const status = usePremiumStore(state => state.status);
  const planId = usePremiumStore(state => state.planId);
  const expiresAtIso = usePremiumStore(state => state.expiresAtIso);
  const autoRenew = usePremiumStore(state => state.autoRenew);
  const setAutoRenew = usePremiumStore(state => state.setAutoRenew);
  const transactions = usePremiumStore(state => state.transactions);

  const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);

  return (
    <ScreenContainer>
      <ScreenHeader title="Gói của tôi" onBack={() => navigation.goBack()} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-sm">
        {status === 'premium' ? (
          <>
            <AppCard className="gap-md">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-sm">
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-md bg-primary-soft">
                    <Sparkles size={22} color={colors.primary} />
                  </View>
                  <View className="gap-xxs">
                    <AppText variant="bodyLg">SmartMeal Pro</AppText>
                    <AppText variant="caption" color="secondary">
                      {plan?.label ?? ''}
                    </AppText>
                  </View>
                </View>
                <AppBadge label="Đang hoạt động" tone="primary" icon={<Check size={14} color={colors.onPrimarySoft} />} />
              </View>
              <View className="flex-row justify-between border-t border-border pt-sm">
                <AppText variant="body" color="secondary">
                  Hiệu lực đến
                </AppText>
                <AppText variant="bodyMedium">
                  {expiresAtIso ? format(new Date(expiresAtIso), 'dd/MM/yyyy') : '—'}
                </AppText>
              </View>
              <View className="flex-row items-center justify-between">
                <AppText variant="body" color="secondary">
                  Tự động gia hạn
                </AppText>
                <AppSwitch accessibilityLabel="Tự động gia hạn" checked={autoRenew} onChange={setAutoRenew} />
              </View>
            </AppCard>

            <AppCard className="gap-sm">
              <AppText variant="h3">Quyền lợi đang dùng</AppText>
              {PRO_BENEFITS.map(benefit => (
                <View key={benefit} className="flex-row items-center gap-sm">
                  <Check size={18} color={colors.primary} strokeWidth={2.5} />
                  <AppText variant="body">{benefit}</AppText>
                </View>
              ))}
            </AppCard>

            <View className="flex-row gap-sm">
              <AppButton
                label={autoRenew ? 'Hủy gia hạn' : 'Bật lại gia hạn'}
                variant="outline"
                onPress={() => setAutoRenew(!autoRenew)}
                className="flex-shrink"
              />
              <AppButton
                label="Gia hạn ngay"
                onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PREMIUM)}
                className="flex-1"
              />
            </View>
          </>
        ) : (
          <AppCard className="items-center gap-sm">
            <AppBadge label={MEMBERSHIP_BADGE_LABEL[status]} tone={status === 'free' ? 'neutral' : 'warning'} />
            <AppText variant="h2" className="text-center">
              {status === 'free'
                ? 'Bạn đang dùng gói Free'
                : status === 'expired'
                  ? 'Gói Pro đã hết hạn'
                  : 'Gói Pro đã bị hủy'}
            </AppText>
            <AppText variant="body" color="secondary" className="text-center">
              Nâng cấp Pro để mở khóa AI không giới hạn, Fridge Scanner và Meal Plan nâng cao.
            </AppText>
            <AppButton
              label={status === 'free' ? 'Nâng cấp Pro' : 'Gia hạn ngay'}
              onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PREMIUM)}
              className="w-full"
            />
          </AppCard>
        )}

        <InlineBanner
          icon={<Info size={20} color={colors.info} />}
          description="Khi gói hết hạn, tài khoản chuyển về Free. Dữ liệu của bạn vẫn được giữ nguyên."
        />

        <View className="gap-sm">
          <AppText variant="h2">Lịch sử giao dịch</AppText>
          {transactions.length === 0 ? (
            <AppText variant="body" color="secondary">
              Chưa có giao dịch nào.
            </AppText>
          ) : (
            <AppCard className="gap-0">
              {transactions.map(transaction => {
                const transactionPlan = BILLING_PLAN_OPTIONS.find(option => option.id === transaction.planId);
                const method = PAYMENT_METHOD_OPTIONS.find(option => option.id === transaction.paymentMethodId);
                return (
                  <View key={transaction.id} className="flex-row items-start gap-sm border-t border-border py-sm">
                    <View className="flex-1 gap-xxs">
                      <AppText variant="bodyMedium">{`Pro · ${transactionPlan?.label ?? ''}`}</AppText>
                      <AppText variant="caption" color="secondary">
                        {`${format(new Date(transaction.createdAtIso), 'dd/MM/yyyy')} · ${formatVnd(transaction.amountVnd)} · ${method?.label ?? ''}`}
                      </AppText>
                      {transaction.note ? (
                        <AppText variant="caption" color="secondary">
                          {transaction.note}
                        </AppText>
                      ) : null}
                    </View>
                    <AppBadge
                      label={TRANSACTION_STATUS_LABEL[transaction.status]}
                      tone={TRANSACTION_TONE[transaction.status]}
                    />
                  </View>
                );
              })}
            </AppCard>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
