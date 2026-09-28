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
