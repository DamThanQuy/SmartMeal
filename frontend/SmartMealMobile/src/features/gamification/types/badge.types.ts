// design/Badges.dc.html (BR-200→212 — chưa có số BR chính thức, dựng theo design.md + artboard).

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
}

export interface BadgeDisplay extends BadgeDefinition {
  unlocked: boolean;
}

export interface CostumeDefinition {
  id: string;
  title: string;
  unlockDescription: string;
}

export interface CostumeDisplay extends CostumeDefinition {
  unlocked: boolean;
  equipped: boolean;
}

export interface BadgesSummary {
  petName: string;
  level: number;
  streakDays: number;
  unlockedBadgeCount: number;
  totalBadgeCount: number;
  badges: BadgeDisplay[];
  costumes: CostumeDisplay[];
}

// design/Badges.dc.html — đúng 9 huy hiệu theo thứ tự hiển thị trong artboard.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first-log', title: 'Khởi đầu', description: 'Ghi bữa đầu tiên' },
  { id: 'streak-3', title: 'Chuỗi 3 ngày', description: '3 ngày liên tiếp' },
  { id: 'hydrated', title: 'Đủ nước', description: 'Uống đủ 8 ly' },
  { id: 'streak-7', title: 'Chuỗi 7 ngày', description: '7 ngày liên tiếp' },
  { id: 'eat-clean-7', title: 'Eat Clean 7', description: 'Hoàn thành thử thách' },
  { id: 'grocery-shopper', title: 'Người đi chợ', description: 'Hoàn tất 1 lần đi chợ' },
  { id: 'ai-snap-10', title: 'AI Snap 10', description: 'Chụp 10 bữa' },
  { id: 'protein-goal', title: 'Đủ protein', description: 'Đạt mục tiêu 5 ngày' },
  { id: 'resilient-30', title: 'Bền bỉ', description: '30 ngày liên tiếp' },
];

// design/Badges.dc.html "Trang phục của Bé Mầm".
export const COSTUME_DEFINITIONS: CostumeDefinition[] = [
  { id: 'straw-hat', title: 'Mũ lá', unlockDescription: 'Mở ở Level 3' },
  { id: 'sunglasses', title: 'Kính râm', unlockDescription: 'Mở ở Level 6' },
  { id: 'green-scarf', title: 'Khăn xanh', unlockDescription: 'Mở khi đạt chuỗi 7 ngày' },
  { id: 'backpack', title: 'Ba lô', unlockDescription: 'Mở khi hoàn thành 1 thử thách' },
];
