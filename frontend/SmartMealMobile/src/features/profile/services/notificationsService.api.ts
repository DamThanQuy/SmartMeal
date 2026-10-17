import { api, ENDPOINTS } from '@/services/api';
import { todayIso } from '@/utils/date';
import type {
  MarkAllNotificationsReadApiDto,
  NotificationApiDto,
  NotificationListApiDto,
} from '../types/notifications.api.types';
import type { NotificationsResult } from '../types/profile.types';
import { fromNotificationListDto } from './notifications.mapper';

// Thông báo trong app do server tạo từ sự kiện thật (Bé Mầm lên cấp, huy hiệu, thử thách, danh sách đi chợ, gói
// Pro). Nhắc giờ ăn/uống nước là thông báo cục bộ trên máy (remindersService), không nằm ở đây.
export const notificationsApiService = {
  // GET /notifications?date= — server đánh giá lại tiến trình Bé Mầm theo "hôm nay" của máy (như /gamification).
  async getNotifications(): Promise<NotificationsResult> {
    const dto = await api.get<NotificationListApiDto>(ENDPOINTS.notifications.list, { params: { date: todayIso() } });
    return fromNotificationListDto(dto);
  },

  // PATCH /notifications/{id}/read — idempotent.
  async markRead(notificationId: string) {
    await api.patch<NotificationApiDto>(ENDPOINTS.notifications.read(notificationId));
  },

  // POST /notifications/read-all.
  async markAllRead() {
    await api.post<MarkAllNotificationsReadApiDto>(ENDPOINTS.notifications.readAll);
  },
};
