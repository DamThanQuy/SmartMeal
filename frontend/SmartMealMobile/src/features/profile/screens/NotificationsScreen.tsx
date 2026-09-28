import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Droplet, PawPrint, RefreshCw, ShoppingCart, Target, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useMarkAllNotificationsRead, useNotifications } from '../hooks/useNotifications';
import type { NotificationIcon, NotificationItem } from '../types/profile.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>;

const ICON_BY_TYPE: Record<NotificationIcon, typeof Droplet> = {
  quickLog: Target,
  pet: PawPrint,
  water: Droplet,
  healthConnect: RefreshCw,
  grocery: ShoppingCart,
  challenge: Trophy,
};

// design/Notifications.dc.html (BR-220→BR-222 — business_rule.md chưa có số BR này, dựng theo
// design.md + artboard).
export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  // "grocery" chưa có route riêng — Grocery chỉ là toggle cục bộ trong tab Planner (xem
  // src/navigation/MainTabNavigator.tsx) nên tạm trỏ về tab Thực đơn (gần đúng, cách 1 lần chạm).
  const handlePress = (item: NotificationItem) => {
    if (item.icon === 'quickLog') {
      navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, {});
    } else if (item.icon === 'healthConnect') {
      navigation.navigate(MAIN_STACK_ROUTES.HEALTH_CONNECT);
    } else if (item.icon === 'pet' || item.icon === 'challenge') {
      navigation.navigate(MAIN_STACK_ROUTES.PET);
    } else if (item.icon === 'grocery') {
      navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.PLANNER });
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
    { title: 'HÔM NAY', data: data.filter(item => item.section === 'today') },
    { title: 'TRƯỚC ĐÓ', data: data.filter(item => item.section === 'earlier') },
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
        rightContent={data.length > 0 ? markAllReadButton : undefined}
      />
      {data.length === 0 ? (
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
