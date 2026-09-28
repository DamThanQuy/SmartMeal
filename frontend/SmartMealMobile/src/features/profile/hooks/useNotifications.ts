import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notificationsService';

const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsService.getNotifications(),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}
