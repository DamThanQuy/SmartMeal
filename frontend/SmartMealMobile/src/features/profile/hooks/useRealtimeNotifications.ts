import {
  type QueryClient,
  type QueryKey,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AI_QUOTA_QUERY_KEY } from '@/constants/queryKeys';
import { premiumService } from '@/features/premium';
import { useAuthStore } from '@/state/auth/authStore';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { subscribeToNotifications } from '../services/notificationsRealtime';
import type {
  NotificationItem,
  NotificationsResult,
} from '../types/profile.types';
import { NOTIFICATIONS_QUERY_KEY } from './useNotifications';

/** Màn đang mở đọc lại khi có thông báo của nhóm tương ứng (lên cấp → Bé Mầm, huy hiệu → Huy hiệu...). */
const RELATED_QUERY_KEYS: Record<string, readonly QueryKey[]> = {
  pet: [['pet']],
  badge: [['badges'], ['pet']],
  challenge: [['challenges'], ['pet']],
  grocery: [['grocery']],
  premium: [['subscription'], AI_QUOTA_QUERY_KEY],
};

function addToList(queryClient: QueryClient, item: NotificationItem): void {
  queryClient.setQueryData<NotificationsResult>(
    NOTIFICATIONS_QUERY_KEY,
    current => {
      if (!current || current.items.some(existing => existing.id === item.id))
        return current;
      return {
        items: [item, ...current.items],
        unreadCount: current.unreadCount + (item.read ? 0 : 1),
      };
    },
  );
}

/**
 * Nghe thông báo real-time khi đã đăng nhập: thêm ngay vào danh sách + chấm đỏ ở chuông, làm mới dữ liệu liên quan
 * (gói Pro vừa kích hoạt thì mở khóa tính năng ngay), rồi gọi `onNotification` để hiện banner/thông báo hệ thống.
 * Tự ngắt khi đăng xuất hoặc hết phiên; kết nối lại thì đọc lại danh sách để không sót thông báo.
 */
export function useRealtimeNotifications(
  onNotification: (item: NotificationItem) => void,
): void {
  const queryClient = useQueryClient();
  const enabled = useAuthStore(
    state => state.isAuthenticated && !state.sessionExpired,
  );
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeToNotifications({
      onNotification: (item, category) => {
        addToList(queryClient, item);
        RELATED_QUERY_KEYS[category]?.forEach(
          queryKey => void queryClient.invalidateQueries({ queryKey }),
        );
        if (category === 'premium') {
          premiumService
            .getStatus()
            .then(membership =>
              usePremiumStore.getState().hydrateMembership(membership),
            )
            .catch(() => {});
        }
        onNotificationRef.current(item);
      },
      onConnected: () =>
        void queryClient.invalidateQueries(
          { queryKey: NOTIFICATIONS_QUERY_KEY },
          { cancelRefetch: false },
        ),
    });
  }, [enabled, queryClient]);
}
