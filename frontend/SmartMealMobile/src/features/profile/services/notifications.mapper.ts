import { differenceInCalendarDays, format } from 'date-fns';
import { parseApiDateTime } from '@/utils/date';
import type { NotificationApiDto, NotificationListApiDto } from '../types/notifications.api.types';
import type { NotificationIcon, NotificationItem, NotificationsResult } from '../types/profile.types';

// Quy đổi /notifications → type FE: nhóm của server → biểu tượng/màn đích, thời điểm UTC → nhãn theo giờ máy
// ("HH:mm" hôm nay, "Hôm qua", "dd/MM").

const ICON_BY_CATEGORY: Record<string, NotificationIcon> = {
  pet: 'pet',
  badge: 'badge',
  challenge: 'challenge',
  grocery: 'grocery',
  premium: 'premium',
};

export function notificationTimeLabel(createdAt: Date, now: Date): Pick<NotificationItem, 'timeLabel' | 'section'> {
  const daysAgo = differenceInCalendarDays(now, createdAt);
  if (daysAgo <= 0) return { timeLabel: format(createdAt, 'HH:mm'), section: 'today' };
  if (daysAgo === 1) return { timeLabel: 'Hôm qua', section: 'earlier' };
  const sameYear = createdAt.getFullYear() === now.getFullYear();
  return { timeLabel: format(createdAt, sameYear ? 'dd/MM' : 'dd/MM/yyyy'), section: 'earlier' };
}

export function fromNotificationDto(dto: NotificationApiDto, now: Date = new Date()): NotificationItem {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.body,
    read: dto.isRead,
    // Nhóm mới mà bản app này chưa biết vẫn hiện được, chỉ không có màn đích riêng.
    icon: ICON_BY_CATEGORY[dto.category] ?? 'general',
    createdAtIso: dto.createdAt,
    ...notificationTimeLabel(parseApiDateTime(dto.createdAt), now),
  };
}

export function fromNotificationListDto(dto: NotificationListApiDto, now: Date = new Date()): NotificationsResult {
  return { items: dto.items.map(item => fromNotificationDto(item, now)), unreadCount: dto.unreadCount };
}
