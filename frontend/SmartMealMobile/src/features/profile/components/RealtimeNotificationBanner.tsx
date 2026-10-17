import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton, AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useMarkNotificationRead } from '../hooks/useNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { localNotificationService } from '../services/localNotificationService';
import {
  isNotificationIcon,
  openNotificationsScreen,
  openNotificationTarget,
} from '../services/notificationTarget';
import type { NotificationItem } from '../types/profile.types';
import { NotificationTypeIcon } from './NotificationTypeIcon';

/** Banner tự ẩn sau chừng này nếu người dùng không bấm. */
const BANNER_DURATION_MS = 5_000;

interface BannerState {
  item: NotificationItem;
  /** Số thông báo khác đến liền trước đó (đang được gộp vào banner này). */
  more: number;
}

/**
 * Hiện thông báo real-time (gắn một lần ở MainNavigator, nằm trên mọi màn). Đang mở app → banner trên cùng màn hình:
 * bấm để mở màn liên quan và đánh dấu đã đọc, tự ẩn sau 5 giây; nhiều thông báo liền nhau (vd. hoàn thành thử thách +
 * lên cấp) thì gộp lại, bấm mở danh sách. App đang chạy nền → thông báo hệ thống của máy (bản build có
 * expo-notifications và đã cấp quyền); bấm vào cũng mở màn liên quan.
 */
export function RealtimeNotificationBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { mutate: markRead } = useMarkNotificationRead();
  const [banner, setBanner] = useState<BannerState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setBanner(null);
  }, []);

  const show = useCallback(
    (item: NotificationItem) => {
      if (AppState.currentState !== 'active') {
        localNotificationService
          .presentNow({
            title: item.title,
            body: item.description,
            data: { notificationId: item.id, icon: item.icon },
          })
          .catch(() => {});
        return;
      }
      setBanner(current => ({ item, more: current ? current.more + 1 : 0 }));
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, BANNER_DURATION_MS);
    },
    [dismiss],
  );

  useRealtimeNotifications(show);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  // Bấm thông báo hệ thống của sự kiện (nhắc nhở cục bộ không gắn notificationId nên bị bỏ qua).
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: () => void = () => {};
    localNotificationService
      .addTapListener(data => {
        if (
          typeof data.notificationId !== 'string' ||
          !isNotificationIcon(data.icon)
        )
          return;
        markRead(data.notificationId);
        if (!openNotificationTarget(data.icon)) openNotificationsScreen();
      })
      .then(stop => {
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [markRead]);

  if (!banner) return null;
  const { item, more } = banner;

  const handlePress = () => {
    dismiss();
    if (more > 0) {
      openNotificationsScreen();
      return;
    }
    markRead(item.id);
    if (!openNotificationTarget(item.icon)) openNotificationsScreen();
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(150)}
      style={{
        position: 'absolute',
        top: insets.top + spacing.xs,
        left: spacing.md,
        right: spacing.md,
      }}
    >
      {/* Bóng đặt cùng view có nền + bo góc (như SuccessToast) — Android elevation cần nền, web/iOS theo đúng góc bo. */}
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-sm rounded-lg border border-border bg-surface-elevated p-sm"
        style={shadows.elevated}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            more > 0
              ? `${item.title}. Xem ${more + 1} thông báo mới`
              : `${item.title}. ${item.description}`
          }
          onPress={handlePress}
          className="min-h-[44px] flex-1 flex-row items-center gap-sm"
        >
          <NotificationTypeIcon icon={item.icon} />
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium" numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText variant="caption" color="secondary" numberOfLines={2}>
              {more > 0
                ? `Và ${more} thông báo mới khác — chạm để xem tất cả`
                : item.description}
            </AppText>
          </View>
        </Pressable>
        <AppIconButton
          icon={<X size={18} color={colors.textSecondary} />}
          accessibilityLabel="Đóng thông báo"
          onPress={dismiss}
        />
      </View>
    </Animated.View>
  );
}
