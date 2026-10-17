import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { BADGE_DEFINITIONS, type BadgesSummary } from '../types/badge.types';
import type { ChallengeApiDto } from '../types/challenge.api.types';
import type { ChallengeWithWindow } from '../types/challenge.types';
import type { BadgesSummaryDto, HealthPetStatusDto, PetTaskDto, StreakStatusDto } from '../types/gamification.api.types';
import type { PetChallenge, PetState, PetTaskItem } from '../types/gamification.types';

// Quy đổi DTO /gamification/* → type FE. Mọi con số (XP, cấp, nhiệm vụ, tiến độ thử thách) do server
// tính; FE chỉ hiển thị — không tự tính lại hay cộng XP ở máy (review PR #9 G1/G3).

const DEFAULT_PET_NAME = 'Bé Mầm';
const DEFAULT_XP_PER_LEVEL = 500;

function formatProgress(task: PetTaskDto): string {
  if (task.unit === 'bữa') return task.completed ? 'Xong' : 'Chưa ghi';
  return `${Math.round(task.progressCurrent)}/${Math.round(task.progressTarget)} ${task.unit}`;
}

export function fromPetTaskDto(task: PetTaskDto): PetTaskItem {
  return {
    id: task.id,
    label: task.label,
    xpReward: task.xpReward,
    progressCurrent: task.progressCurrent,
    progressTarget: task.progressTarget,
    progressLabel: formatProgress(task),
    completed: task.completed,
  };
}

/**
 * Ô "Chuỗi ngày" Thứ 2 → Chủ nhật của tuần chứa hôm nay. Server trả 7 ngày kết thúc hôm nay (cũ → mới)
 * nên đặt từng ngày vào đúng ô theo NGÀY, không theo vị trí trong mảng (review PR #9 G2).
 */
export function weekCompletionFrom(streak: StreakStatusDto, todayIso: string): boolean[] {
  const monday = startOfWeek(parseISO(todayIso), { weekStartsOn: 1 });
  const logged = new Set(streak.recentActivity.filter(day => day.hasLogged).map(day => day.date));
  return Array.from({ length: 7 }, (_, index) => logged.has(format(addDays(monday, index), 'yyyy-MM-dd')));
}

/**
 * Khung ngày là của từng người dùng: tham gia hôm nay mở khung [hôm nay, hôm nay + N − 1]. Chưa tham gia
 * hoặc khung cũ đã hết (isExpired) thì hiện như thử thách có thể tham gia (lại) ngay.
 */
export function fromChallengeDto(dto: ChallengeApiDto, todayIso: string): ChallengeWithWindow {
  const joined = dto.isJoined && !dto.isExpired;
  const startIso = joined && dto.startDate ? dto.startDate : todayIso;
  const endIso =
    joined && dto.endDate ? dto.endDate : format(addDays(parseISO(todayIso), dto.durationDays - 1), 'yyyy-MM-dd');
  const badge = BADGE_DEFINITIONS.find(definition => definition.id === dto.rewardBadge);
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    startIso,
    endIso,
    xpReward: dto.rewardExp,
    badgeId: badge?.id,
    rewardLabel: badge ? undefined : dto.rewardBadge ?? undefined,
    joined: joined || dto.isCompleted,
    completed: dto.isCompleted,
    windowState: 'active',
    dayCurrent: joined ? Math.min(dto.durationDays, Math.max(1, dto.currentDay)) : 1,
    dayTotal: dto.durationDays,
    completedDays: dto.isCompleted ? dto.durationDays : joined ? dto.completedDays : 0,
  };
}

function petChallengeFrom(challenges: ChallengeWithWindow[]): PetChallenge | null {
  const active = challenges.find(challenge => challenge.joined && !challenge.completed);
  return active
    ? { title: active.title, dayCurrent: active.dayCurrent, dayTotal: active.dayTotal, xpReward: active.xpReward }
    : null;
}

export function fromPetStatus(
  pet: HealthPetStatusDto,
  streak: StreakStatusDto,
  challenges: ChallengeWithWindow[],
  todayIso: string,
): PetState {
  return {
    name: pet.petName || DEFAULT_PET_NAME,
    level: pet.level,
    xpIntoLevel: pet.xpIntoLevel,
    xpPerLevel: pet.xpPerLevel > 0 ? pet.xpPerLevel : DEFAULT_XP_PER_LEVEL,
    streakDays: streak.currentStreak,
    weekCompletion: weekCompletionFrom(streak, todayIso),
    tasks: pet.tasks.map(fromPetTaskDto),
    challenge: petChallengeFrom(challenges),
    message: pet.statusMessage,
  };
}

export function fromBadgesSummaryDto(dto: BadgesSummaryDto): BadgesSummary {
  return {
    petName: dto.petName || DEFAULT_PET_NAME,
    level: dto.level,
    streakDays: dto.streakDays,
    unlockedBadgeCount: dto.unlockedBadgeCount,
    totalBadgeCount: dto.totalBadgeCount,
    badges: dto.badges.map(({ id, title, description, unlocked }) => ({ id, title, description, unlocked })),
    costumes: dto.costumes.map(({ id, title, unlockDescription, unlocked, equipped }) => ({
      id,
      title,
      unlockDescription,
      unlocked,
      equipped,
    })),
  };
}
