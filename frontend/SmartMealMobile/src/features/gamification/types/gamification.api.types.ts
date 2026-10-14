// DTO /gamification/* (docs/SmartMeal_API_Contract.md) — chỉ service và mapper import.

export interface PetTaskDto {
  /** breakfast | protein | water. */
  id: string;
  label: string;
  xpReward: number;
  progressCurrent: number;
  progressTarget: number;
  /** "bữa" | "g" | "ml". */
  unit: string;
  completed: boolean;
}

export interface HealthPetStatusDto {
  petName: string;
  petType: string;
  level: number;
  /** XP trong cấp hiện tại (tên cũ, cùng giá trị với xpIntoLevel). */
  exp: number;
  nextLevelExp: number;
  totalXp: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  stage: string;
  mood: string;
  statusMessage: string;
  currentOutfit: string;
  nutritionScoreToday: number;
  /** Nhiệm vụ hôm nay — server cộng XP đúng một lần mỗi ngày khi hoàn thành (BR-202). */
  tasks: PetTaskDto[];
}

export interface StreakDayDto {
  date: string;
  dayOfWeek: string;
  hasLogged: boolean;
}

export interface StreakStatusDto {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  hasLoggedToday: boolean;
  /** 7 ngày liên tiếp KẾT THÚC hôm nay, cũ → mới (không phải Thứ 2 → Chủ nhật). */
  recentActivity: StreakDayDto[];
}

export interface BadgeApiDto {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface CostumeApiDto {
  id: string;
  title: string;
  unlockDescription: string;
  unlocked: boolean;
  equipped: boolean;
}

export interface BadgesSummaryDto {
  petName: string;
  level: number;
  streakDays: number;
  unlockedBadgeCount: number;
  totalBadgeCount: number;
  badges: BadgeApiDto[];
  costumes: CostumeApiDto[];
}
