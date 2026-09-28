import type { NotificationItem } from '../types/profile.types';

// design/Notifications.dc.html.
export const NOTIFICATIONS_MOCK: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Đến giờ ăn tối',
    description: 'Ghi bữa tối để giữ chuỗi 5 ngày nhé.',
    timeLabel: '18:30',
    read: false,
    icon: 'quickLog',
    section: 'today',
  },
  {
    id: 'notif-2',
    title: 'Bé Mầm đã lên Level 5',
    description: 'Bạn mở khóa phụ kiện mới cho linh vật.',
    timeLabel: '12:05',
    read: false,
    icon: 'pet',
    section: 'today',
  },
  {
    id: 'notif-3',
    title: 'Uống nước thôi',
    description: 'Bạn đã uống 5/8 ly hôm nay.',
    timeLabel: '10:00',
    read: true,
    icon: 'water',
    section: 'today',
  },
  {
    id: 'notif-4',
    title: 'Chưa đồng bộ được Health Connect',
    description: 'Kiểm tra quyền truy cập rồi thử lại.',
    timeLabel: 'Hôm qua',
    read: true,
    icon: 'healthConnect',
    section: 'earlier',
  },
  {
    id: 'notif-5',
    title: 'Danh sách đi chợ đã sẵn sàng',
    description: '9 nguyên liệu cho thực đơn tuần này.',
    timeLabel: '21/09',
    read: true,
    icon: 'grocery',
    section: 'earlier',
  },
  {
    id: 'notif-6',
    title: 'Thử thách mới: 7 ngày Eat Clean',
    description: 'Tham gia để nhận +100 XP.',
    timeLabel: '20/09',
    read: true,
    icon: 'challenge',
    section: 'earlier',
  },
];
