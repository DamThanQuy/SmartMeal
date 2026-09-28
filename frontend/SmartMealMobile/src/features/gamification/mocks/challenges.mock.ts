import { addDays, format, subDays } from 'date-fns';
import type { Challenge } from '../types/challenge.types';

function todayPlus(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}

function todayMinus(days: number): string {
  return format(subDays(new Date(), days), 'yyyy-MM-dd');
}

// design/Challenges.dc.html — "7 ngày Eat Clean" seed ở ngày 4/7 (đã tham gia), "Uống đủ nước
// 7 ngày" đang mở đăng ký (chưa tham gia), "14 ngày không nước ngọt" chưa tới ngày bắt đầu,
// "Thử thách tháng 8" đã kết thúc. Ngày tính tương đối theo "hôm nay" để luôn đúng BR-211 (chỉ
// cho tham gia khi hôm nay nằm trong [Start, End]) dù chạy vào thời điểm nào.
export function createChallengesSeedMock(): Challenge[] {
  return [
    {
      id: 'eat-clean-7',
      title: '7 ngày Eat Clean',
      description: 'Ghi ít nhất 1 bữa Eat Clean mỗi ngày trong 7 ngày liên tiếp.',
      startIso: todayMinus(3),
      endIso: todayPlus(3),
      xpReward: 100,
      badgeId: 'eat-clean-7',
      costumeId: 'backpack',
      joined: true,
      completed: false,
    },
    {
      id: 'water-7-days',
      title: 'Uống đủ nước 7 ngày',
      description: 'Uống đủ 8 ly mỗi ngày trong 7 ngày liên tiếp.',
      startIso: todayPlus(0),
      endIso: todayPlus(6),
      xpReward: 70,
      joined: false,
      completed: false,
    },
    {
      id: 'no-soda-14',
      title: '14 ngày không nước ngọt',
      description: 'Không ghi nhận nước ngọt trong nhật ký suốt 14 ngày.',
      startIso: todayPlus(3),
      endIso: todayPlus(16),
      xpReward: 140,
      joined: false,
      completed: false,
    },
    {
      id: 'august-challenge',
      title: 'Thử thách tháng 8',
      description: 'Thử thách theo tháng của SmartMeal.',
      startIso: todayMinus(60),
      endIso: todayMinus(30),
      xpReward: 100,
      joined: false,
      completed: false,
    },
  ];
}
