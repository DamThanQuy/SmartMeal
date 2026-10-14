// DTO /notifications (docs/SmartMeal_API_Contract.md) — chỉ service và mapper import.

export interface NotificationApiDto {
  id: string;
  /** pet | badge | challenge | grocery | premium. */
  category: string;
  title: string;
  body: string;
  /** ISO 8601 UTC. */
  createdAt: string;
  isRead: boolean;
}

export interface NotificationListApiDto {
  /** Mới → cũ. */
  items: NotificationApiDto[];
  unreadCount: number;
}

export interface MarkAllNotificationsReadApiDto {
  updated: number;
}
