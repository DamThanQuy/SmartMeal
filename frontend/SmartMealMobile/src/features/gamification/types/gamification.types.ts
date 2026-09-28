// BR-200→BR-212 — business_rule.md hiện chưa có đúng số BR này (chỉ có BR-230+ Premium); dựng
// theo docs/design.md mục 36/37 (Gamification/Challenge) + design/Pet.dc.html. BR-202 ("không
// cộng trùng XP cho cùng 1 sự kiện") áp dụng qua awardXpOnce trong gamificationService.

export interface PetTaskItem {
  id: string;
  label: string;
  xpReward: number;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
  completed: boolean;
}

export interface PetChallenge {
  title: string;
  dayCurrent: number;
  dayTotal: number;
  xpReward: number;
}

export interface PetState {
  name: string;
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  streakDays: number;
  /** 7 giá trị Thứ 2 → Chủ nhật — ngày đã hoàn thành mục tiêu (design/Pet.dc.html "Chuỗi ngày"). */
  weekCompletion: boolean[];
  tasks: PetTaskItem[];
  challenge: PetChallenge;
  message: string;
}
