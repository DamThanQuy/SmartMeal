import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format } from 'date-fns';
import { RefreshCw, ShoppingBasket } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, InlineBanner, LoadingState, ScreenContainer } from '@/components/common';
import { AppButton, AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { currentWeekStartIso } from '@/features/meal-planner';
import { MAIN_STACK_ROUTES, PLANNER_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList, PlannerStackParamList } from '@/navigation/types';
import { usePlanChangeStore } from '@/state/planner/planChangeStore';
import { useTheme } from '@/theme/ThemeProvider';
import { GroceryItemRow } from '../components/GroceryItemRow';
import { useGroceryList, useRegenerateGroceryList, useToggleGroceryItem } from '../hooks/useGrocery';

type Props = NativeStackScreenProps<PlannerStackParamList, 'Grocery'>;

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

// design/Grocery.dc.html + GroceryEmpty.dc.html (BR-170→BR-174). Đợt 11 (sửa lệch) — nay là
// Stack.Screen thật trong PlannerStackNavigator (trước là toggle cục bộ, xem MainTabNavigator.tsx).
export function GroceryScreen({ navigation, route }: Props) {
  const outerNavigation = navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const weekStartIso = route.params?.weekStartIso ?? currentWeekStartIso();
  const { data, isLoading, isError, error, refetch } = useGroceryList(weekStartIso);
  const toggleItem = useToggleGroceryItem(weekStartIso);
  const regenerate = useRegenerateGroceryList(weekStartIso);
  const planChangedAt = usePlanChangeStore(state => state.changedAt[weekStartIso]);

  const openMealPlanner = () =>
    navigation.navigate(PLANNER_STACK_ROUTES.MEAL_PLANNER, { weekStartIso });

  const header = (
    <View className="gap-md py-xs">
      <AppText variant="h1">Thực đơn</AppText>
      <AppSegmentedControl
        options={[
          { id: 'planner', label: 'Thực đơn' },
          { id: 'grocery', label: 'Đi chợ' },
        ]}
        value="grocery"
        onChange={value => {
          if (value === 'planner') openMealPlanner();
        }}
      />
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer scroll contentContainerClassName="gap-lg">
        {header}
        <LoadingState lines={10} />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer contentContainerClassName="gap-lg">
        {header}
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  // Danh sách là của kỳ thực đơn đã dùng để tạo (BE giữ một danh sách/người dùng) — có thể khác tuần đang xem.
  const periodStartIso = data.periodStartIso ?? weekStartIso;
  const periodEndIso = data.periodEndIso ?? format(addDays(new Date(weekStartIso), 6), 'yyyy-MM-dd');
  const weekEndLabel = format(new Date(periodEndIso), 'dd/MM');
  const weekStartLabel = format(new Date(periodStartIso), 'dd/MM');
  const isOtherWeek = data.periodStartIso !== null && data.periodStartIso !== weekStartIso;
  const planChangedSinceGenerated =
    planChangedAt !== undefined && data.generatedAtIso !== null && planChangedAt > Date.parse(data.generatedAtIso);
  const lastTrip = data.lastTrip;
  const progressPercent =
    data.totalItems > 0 ? Math.round((data.purchasedItems / data.totalItems) * 100) : 0;

  return (
    <ScreenContainer>
      {header}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-md py-sm"
      >
        <View className="gap-xs">
          <View className="flex-row items-baseline justify-between">
            <AppText variant="h2">Đi chợ tuần này</AppText>
            <AppText variant="body" color="secondary">
              {`${data.purchasedItems}/${data.totalItems} đã mua`}
            </AppText>
          </View>
          <AppText variant="body" color="secondary">
            {data.periodStartIso ? `Tổng hợp từ thực đơn ${weekStartLabel} — ${weekEndLabel}` : 'Chưa tạo từ thực đơn'}
          </AppText>
          <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
            <View
              className="h-[8px] rounded-pill bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        {isOtherWeek || planChangedSinceGenerated ? (
          <InlineBanner
            icon={<RefreshCw size={20} color={colors.warning} />}
            title={isOtherWeek ? 'Danh sách đang theo tuần khác' : 'Thực đơn đã đổi'}
            description="Tạo lại để cập nhật nguyên liệu theo thực đơn tuần này. Món bạn tự thêm vẫn được giữ."
          />
        ) : null}
        {regenerate.isError ? (
          <AppText variant="caption" color="error" accessibilityRole="alert">
            {regenerate.error.message}
          </AppText>
        ) : null}
        {data.periodStartIso || data.groups.length > 0 ? (
          <AppButton
            label="Tạo lại theo thực đơn tuần này"
            variant="outline"
            loading={regenerate.isPending}
            onPress={() => regenerate.mutate()}
          />
        ) : null}
        {toggleItem.isError ? (
          <AppText variant="caption" color="error" accessibilityRole="alert">
            {toggleItem.error.message}
          </AppText>
        ) : null}

        {data.groups.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket size={40} color={colors.textMuted} />}
            title="Chưa có danh sách đi chợ"
            description="Lên thực đơn tuần trước, SmartMeal sẽ tự cộng dồn nguyên liệu, nhóm theo quầy và ước tính chi phí."
            actionLabel="Đi tới Thực đơn"
            onAction={openMealPlanner}
            secondaryActionLabel="Thêm nguyên liệu thủ công"
            onSecondaryAction={() =>
              outerNavigation?.navigate(MAIN_STACK_ROUTES.GROCERY_ADD, { weekStartIso })
            }
          />
        ) : (
          data.groups.map(group => (
            <AppCard key={group.category} className="gap-xxs">
              <AppText variant="h3">{group.category}</AppText>
              {group.items.map(item => (
                <GroceryItemRow
                  key={item.id}
                  item={item}
                  onToggle={() =>
                    toggleItem.mutate({
                      itemId: item.id,
                      nextStatus: item.status === 'purchased' ? 'pending' : 'purchased',
                    })
                  }
                />
              ))}
            </AppCard>
          ))
        )}
      </ScrollView>

      {data.groups.length > 0 ? (
        <View className="flex-row items-center gap-md border-t border-border py-md">
          <View className="gap-xxs">
            <AppText variant="caption" color="secondary">
              Ước tính
            </AppText>
            <AppText variant="h2">{formatVnd(data.estimatedTotalCostVnd)}</AppText>
            {lastTrip?.actualCostVnd !== undefined ? (
              <AppText variant="caption" color="secondary">
                {`Lần trước: ${formatVnd(lastTrip.actualCostVnd)}`}
              </AppText>
            ) : null}
          </View>
          <AppButton
            label="Hoàn tất mua sắm"
            onPress={() =>
              outerNavigation?.navigate(MAIN_STACK_ROUTES.GROCERY_DONE, { weekStartIso })
            }
            className="flex-1"
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
