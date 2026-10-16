import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { NotificationTypeIcon } from '../components/NotificationTypeIcon';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';
import { openNotificationTarget } from '../services/notificationTarget';
import type { NotificationItem } from '../types/profile.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>;

// design/Notifications.dc.html (BR-220→BR-222 — business_rule.md chưa có số BR này, dựng theo
// design.md + artboard). Gọi API thật: thông báo do server tạo từ sự kiện thật (lên cấp, huy hiệu, thử thách,
// danh sách đi chợ, gói Pro); bấm vào thì đánh dấu đã đọc rồi mở màn liên quan. Thông báo mới tới real-time
// (RealtimeNotificationBanner) được thêm thẳng vào danh sách này.
export function NotificationsScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  // Màn đích theo nhóm dùng chung với banner/thông báo hệ thống (services/notificationTarget.ts).
  const handlePress = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id);
    openNotificationTarget(item.icon);
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
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => handlePress(item)}
                  className={`flex-row gap-sm border-b border-border py-sm ${
                    item.read ? 'bg-surface' : 'bg-primary-soft'
                  }`}
                >
                  <NotificationTypeIcon icon={item.icon} />
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
