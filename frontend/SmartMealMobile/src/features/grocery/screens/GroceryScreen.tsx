import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format } from 'date-fns';
import { ShoppingBasket } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppButton, AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { currentWeekStartIso } from '@/features/meal-planner';
import { MAIN_STACK_ROUTES, PLANNER_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList, PlannerStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { GroceryItemRow } from '../components/GroceryItemRow';
import { useGroceryList, useToggleGroceryItem } from '../hooks/useGrocery';

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
