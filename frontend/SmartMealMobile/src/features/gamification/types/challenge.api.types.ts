// DTO /gamification/challenges (docs/SmartMeal_API_Contract.md) — chỉ service và mapper import.
export interface ChallengeApiDto {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  durationDays: number;
  /** Số ngày trong khung đã đạt mục tiêu. */
  completedDays: number;
  rewardExp: number;
  /** Nhãn phần thưởng tự do (vd. "Hydration Master"). */
  rewardBadge: string | null;
  isJoined: boolean;
  isCompleted: boolean;
  /** DrinkWater | EatClean | Exercise | NoSugar. */
  category: string | null;
  targetValuePerDay: number;
  /** Khung ngày của người dùng (null khi chưa tham gia). Kết thúc = bắt đầu + durationDays − 1. */
  startDate: string | null;
  endDate: string | null;
  /** Hôm nay là ngày thứ mấy của khung; 0 khi chưa tham gia. */
  currentDay: number;
  /** Hết khung mà chưa hoàn thành — tham gia lại sẽ bắt đầu khung mới. */
  isExpired: boolean;
}
