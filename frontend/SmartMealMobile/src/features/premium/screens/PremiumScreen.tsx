import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Minus, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useSubscriptionPlans } from '../hooks/useSubscription';
import { FEATURE_COMPARISON_MOCK } from '../mocks/premium.mock';

type Props = NativeStackScreenProps<MainStackParamList, 'Premium'>;

// design/Premium.dc.html (docs/design.md mục 38, BR-230→BR-233, BR-241/242). "Nâng cấp Pro"
// chỉ điều hướng sang PaymentMethod (Đợt 13, tách khỏi màn này) rồi PaymentPending — KHÔNG kích
// hoạt Premium ngay (BR-241/242).
export function PremiumScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data: plans, isLoading, isError, error, refetch } = useSubscriptionPlans();
  const [planId, setPlanId] = useState<BillingPlanId>('yearly');

  // Giá và chu kỳ do backend quyết định nên chưa có bảng giá thì chưa cho chọn gói.
  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
        <LoadingState lines={6} />
      </ScreenContainer>
    );
  }

  if (isError || !plans) {
    return (
      <ScreenContainer>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-sm"
      >
        <View className="items-center gap-sm">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
            <Sparkles size={36} color={colors.primary} />
          </View>
          <AppText variant="h1" className="text-center">
            Nâng cấp SmartMeal Pro
          </AppText>
          <AppText variant="bodyLg" color="secondary" className="text-center">
            Ăn thông minh hơn với AI
          </AppText>
        </View>

        <AppCard className="gap-xxs">
          <View className="flex-row pb-xs">
            <AppText variant="caption" color="secondary" className="flex-[2]">
              Quyền lợi
            </AppText>
            <AppText variant="caption" color="secondary" className="flex-1 text-center">
              Free
            </AppText>
            <AppText variant="caption" color="primary" className="flex-1 text-center">
              Pro
            </AppText>
          </View>
          {FEATURE_COMPARISON_MOCK.map(row => (
            <View
              key={row.label}
              className="flex-row items-center border-t border-border py-sm"
            >
              <AppText variant="body" className="flex-[2]">
                {row.label}
              </AppText>
              <View className="flex-1 items-center">
                {row.freeValueLabel ? (
                  <AppText variant="caption">{row.freeValueLabel}</AppText>
                ) : row.freeIncluded ? (
                  <Check size={20} color={colors.primary} strokeWidth={2.5} />
                ) : (
                  <Minus size={20} color={colors.textMuted} />
                )}
              </View>
              <View className="flex-1 items-center">
                {row.proValueLabel ? (
                  <AppText variant="caption" color="primary">
                    {row.proValueLabel}
                  </AppText>
                ) : (
                  <Check size={20} color={colors.primary} strokeWidth={2.5} />
                )}
              </View>
            </View>
          ))}
        </AppCard>

        <View className="flex-row gap-sm">
          {plans.map(plan => {
            const selected = plan.id === planId;
            return (
              <Pressable
                key={plan.id}
                accessibilityRole="button"
                accessibilityLabel={plan.label}
                accessibilityState={{ selected }}
                onPress={() => setPlanId(plan.id)}
                className={`flex-1 gap-xxs rounded-card p-md ${
                  selected ? 'border-2 border-primary bg-primary-soft' : 'border border-border bg-surface'
                }`}
              >
                <AppText variant="bodyMedium">{plan.label}</AppText>
                <AppText variant="h3">{plan.priceLabel}</AppText>
                <AppText variant="caption" color="secondary">
                  {plan.billingLabel}
                </AppText>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      <View className="gap-sm py-md">
        <AppButton
          label="Nâng cấp Pro"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PAYMENT_METHOD, { planId })}
        />
        <AppText variant="caption" color="secondary" className="text-center">
          Pro chỉ kích hoạt sau khi giao dịch được xác nhận. Khi gói hết hạn, dữ liệu của bạn vẫn
          được giữ nguyên.
        </AppText>
      </View>
    </ScreenContainer>
  );
}
