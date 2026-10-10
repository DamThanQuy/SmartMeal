export interface ChallengeApiDto {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  durationDays: number;
  completedDays: number;
  rewardExp: number;
  rewardBadge?: string;
  isJoined: boolean;
  isCompleted: boolean;
}
