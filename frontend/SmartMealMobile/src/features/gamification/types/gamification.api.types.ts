export interface HealthPetStatusDto {
  petName: string;
  petType: string;
  level: number;
  exp: number;
  nextLevelExp: number;
  stage: string;
  mood: string;
  statusMessage: string;
  currentOutfit: string;
  nutritionScoreToday: number;
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
  recentActivity: StreakDayDto[];
}
