import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Award, Bell, Crown, Droplet, PawPrint, RefreshCw, ShoppingCart, Target, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';
import { currentWeekStartIso } from '@/features/meal-planner';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES, PLANNER_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';
import type { NotificationIcon, NotificationItem } from '../types/profile.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>;

const ICON_BY_TYPE: Record<NotificationIcon, typeof Droplet> = {
  quickLog: Target,
  pet: PawPrint,
  water: Droplet,
  healthConnect: RefreshCw,
  grocery: ShoppingCart,
  challenge: Trophy,
  badge: Award,
  premium: Crown,
  general: Bell,
};

// design/Notifications.dc.html (BR-220→BR-222 — business_rule.md chưa có số BR này, dựng theo
// design.md + artboard). Gọi API thật: thông báo do server tạo từ sự kiện thật (lên cấp, huy hiệu, thử thách,
// danh sách đi chợ, gói Pro); bấm vào thì đánh dấu đã đọc rồi mở màn liên quan.
export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  // Đợt 11 (sửa lệch) — "grocery" nay trỏ thẳng route Grocery (nested Stack của tab Thực đơn,
  // xem PlannerStackNavigator.tsx), trước chỉ trỏ tạm về tab Thực đơn vì Grocery chưa có route riêng.
  const handlePress = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id);

    if (item.icon === 'quickLog') {
      navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, {});
    } else if (item.icon === 'healthConnect') {
      navigation.navigate(MAIN_STACK_ROUTES.HEALTH_CONNECT);
    } else if (item.icon === 'pet') {
      navigation.navigate(MAIN_STACK_ROUTES.PET);
    } else if (item.icon === 'challenge') {
      navigation.navigate(MAIN_STACK_ROUTES.CHALLENGES);
    } else if (item.icon === 'badge') {
      navigation.navigate(MAIN_STACK_ROUTES.BADGES);
    } else if (item.icon === 'premium') {
      navigation.navigate(MAIN_STACK_ROUTES.SUBSCRIPTION);
    } else if (item.icon === 'water') {
      navigation.navigate(MAIN_STACK_ROUTES.WATER_LOG);
    } else if (item.icon === 'grocery') {
      navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
        screen: MAIN_TAB_ROUTES.PLANNER,
        params: {
          screen: PLANNER_STACK_ROUTES.GROCERY,
          params: { weekStartIso: currentWeekStartIso() },
        },
      });
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Thông báo" onBack={() => navigation.goBack()} />
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Thông báo" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const sections = [
    { title: 'HÔM NAY', data: data.items.filter(item => item.section === 'today') },
    { title: 'TRƯỚC ĐÓ', data: data.items.filter(item => item.section === 'earlier') },
  ].filter(section => section.data.length > 0);

  const markAllReadButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đọc hết"
      onPress={() => markAllRead.mutate()}
      className="h-[44px] items-center justify-center"
    >
      <AppText variant="bodyMedium" color="primary">
        Đọc hết
      </AppText>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Thông báo"
        onBack={() => navigation.goBack()}
        rightContent={data.unreadCount > 0 ? markAllReadButton : undefined}
      />
      {data.items.length === 0 ? (
        <EmptyState title="Chưa có thông báo" description="Thông báo mới sẽ xuất hiện ở đây." />
      ) : (
        <>
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderSectionHeader={({ section }) => (
              <AppText variant="caption" color="secondary" className="py-xs font-sans-semibold">
                {section.title}
              </AppText>
            )}
            renderItem={({ item }) => {
              const Icon = ICON_BY_TYPE[item.icon];
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => handlePress(item)}
                  className={`flex-row gap-sm border-b border-border py-sm ${
                    item.read ? 'bg-surface' : 'bg-primary-soft'
                  }`}
                >
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-md bg-primary-soft">
                    <Icon size={22} color={colors.primary} />
                  </View>
                  <View className="flex-1 gap-xxs">
                    <AppText variant="bodyMedium">{item.title}</AppText>
                    <AppText variant="body" color="secondary">
                      {item.description}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {item.timeLabel}
                    </AppText>
                  </View>
                  {!item.read ? <View className="mt-xxs h-[8px] w-[8px] rounded-full bg-primary" /> : null}
                </Pressable>
              );
            }}
          />
        </>
      )}
    </ScreenContainer>
  );
}
