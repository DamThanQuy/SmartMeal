import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notificationsService';
import type { NotificationsResult } from '../types/profile.types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsService.getNotifications(),
  });
}

/** Số thông báo chưa đọc cho chấm đỏ ở chuông (dùng chung cache với màn Thông báo). */
export function useUnreadNotificationsCount(): number {
  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsService.getNotifications(),
    select: result => result.unreadCount,
  });
  return data ?? 0;
}

/** Đánh dấu một thông báo đã đọc — cập nhật cache ngay để chấm chưa đọc biến mất khi bấm. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markRead(notificationId),
    onMutate: notificationId => {
      queryClient.setQueryData<NotificationsResult>(NOTIFICATIONS_QUERY_KEY, current => {
        if (!current) return current;
        const wasUnread = current.items.some(item => item.id === notificationId && !item.read);
        return {
          items: current.items.map(item => (item.id === notificationId ? { ...item, read: true } : item)),
          unreadCount: Math.max(0, current.unreadCount - (wasUnread ? 1 : 0)),
        };
      });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}
