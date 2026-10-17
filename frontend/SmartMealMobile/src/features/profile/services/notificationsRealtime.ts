import { ENDPOINTS } from '@/services/api';
import { openRealtimeConnection } from '@/services/realtime/realtimeConnection';
import type { NotificationApiDto } from '../types/notifications.api.types';
import type { NotificationItem } from '../types/profile.types';
import { fromNotificationDto } from './notifications.mapper';

// Thông báo real-time: server (NotificationsHub) đẩy sự kiện "notification" với đúng DTO của GET /notifications ngay khi
// một thông báo mới được tạo (lên cấp, huy hiệu, thử thách, danh sách đi chợ, gói Pro).

const NOTIFICATION_EVENT = 'notification';

function isNotificationDto(value: unknown): value is NotificationApiDto {
  if (typeof value !== 'object' || value === null) return false;
  const dto = value as Record<string, unknown>;
  return (
    typeof dto.id === 'string' &&
    typeof dto.category === 'string' &&
    typeof dto.title === 'string' &&
    typeof dto.body === 'string' &&
    typeof dto.createdAt === 'string' &&
    typeof dto.isRead === 'boolean'
  );
}

export interface NotificationsRealtimeHandlers {
  onNotification: (item: NotificationItem, category: string) => void;
  /** Vừa kết nối (lần đầu hoặc sau khi rớt): đọc lại danh sách để có cả thông báo tạo lúc chưa kết nối. */
  onConnected: () => void;
}

/** Nghe thông báo mới cho tài khoản đang đăng nhập. Trả hàm dừng nghe. */
export function subscribeToNotifications({
  onNotification,
  onConnected,
}: NotificationsRealtimeHandlers): () => void {
  return openRealtimeConnection({
    path: ENDPOINTS.notifications.hub,
    handlers: {
      [NOTIFICATION_EVENT]: payload => {
        if (isNotificationDto(payload))
          onNotification(fromNotificationDto(payload), payload.category);
      },
    },
    onConnected,
  });
}
