import { addDays, format } from 'date-fns';
import { ShoppingBasket } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppButton, AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { GroceryItemRow } from '../components/GroceryItemRow';
import { useGroceryList, useMarkAllGroceryPurchased, useToggleGroceryItem } from '../hooks/useGrocery';

export interface GroceryScreenProps {
  weekStartIso: string;
  onOpenMealPlanner: () => void;
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

// design/Grocery.dc.html (BR-170→BR-174). Là tab con của MAIN_TAB_ROUTES.PLANNER (toggle cục bộ
// với MealPlannerScreen qua AppSegmentedControl — xem MainTabNavigator).
export function GroceryScreen({ weekStartIso, onOpenMealPlanner }: GroceryScreenProps) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useGroceryList(weekStartIso);
  const toggleItem = useToggleGroceryItem(weekStartIso);
  const markAllPurchased = useMarkAllGroceryPurchased(weekStartIso);

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
          if (value === 'planner') onOpenMealPlanner();
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

  const weekEndLabel = format(addDays(new Date(weekStartIso), 6), 'dd/MM');
  const weekStartLabel = format(new Date(weekStartIso), 'dd/MM');
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
            {`Tổng hợp từ thực đơn ${weekStartLabel} — ${weekEndLabel}`}
          </AppText>
          <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
            <View
              className="h-[8px] rounded-pill bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        {data.groups.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket size={40} color={colors.textMuted} />}
            title="Chưa có danh sách đi chợ"
            description="Lên thực đơn cho tuần này để tự động tạo danh sách nguyên liệu."
            actionLabel="Lên thực đơn"
            onAction={onOpenMealPlanner}
          />
        ) : (
          data.groups.map(group => (
            <AppCard key={group.category} className="gap-xxs">
              <AppText variant="h3">{group.category}</AppText>
              {group.items.map(item => (
                <GroceryItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem.mutate(item.id)}
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
          </View>
          <AppButton
            label="Hoàn tất mua sắm"
            loading={markAllPurchased.isPending}
            onPress={() => markAllPurchased.mutate()}
            className="flex-1"
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
