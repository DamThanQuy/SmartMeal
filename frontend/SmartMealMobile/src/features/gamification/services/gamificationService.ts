import { nutritionService, todayIso } from '@/features/nutrition';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import type { PetState, PetTaskItem } from '../types/gamification.types';

// TODO: replace mock with real API — xpTotal/streak là in-memory store mô phỏng Backend
// (CLAUDE.md mục 8). "Ghi bữa sáng"/"Đạt mục tiêu protein" đọc thật từ nutritionService.getDiaryDay
// (Đợt 3) để XP phản ánh hành động thật trong Diary; "Uống đủ nước" chưa có tính năng ghi nước
// thật trong app nên giữ tiến độ mock tĩnh (CẦN xác nhận khi có Water Log).

export const XP_PER_LEVEL = 500;
const BREAKFAST_XP = 10;
const PROTEIN_XP = 20;

// Seed khớp design/Pet.dc.html: Level 5, 400/500 XP → tổng XP từng nhận = (5-1)*500+400 = 2400.
let xpTotal = 2400;
let streakDays = 5;
const weekCompletion = [true, true, true, true, true, false, false];

// BR-202 — không cộng trùng XP cho cùng 1 sự kiện: mỗi eventId (gắn theo ngày) chỉ được cộng
// XP đúng 1 lần, dù getPetState() được gọi lại nhiều lần trong ngày đó.
const awardedEventIds = new Set<string>();

function awardXpOnce(eventId: string, xp: number): void {
  if (awardedEventIds.has(eventId)) return;
  awardedEventIds.add(eventId);
  xpTotal += xp;
}

function computeLevel(): { level: number; xpIntoLevel: number } {
  return { level: Math.floor(xpTotal / XP_PER_LEVEL) + 1, xpIntoLevel: xpTotal % XP_PER_LEVEL };
}

export const gamificationService = {
  // design/Pet.dc.html — Pet card + Nhiệm vụ hôm nay + Challenge.
  async getPetState(): Promise<PetState> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải dữ liệu Bé Mầm, vui lòng thử lại.');
    }

    const dateIso = todayIso();
    const diary = await nutritionService.getDiaryDay(dateIso);
    const breakfastDone = diary.entriesByMeal.breakfast.length > 0;
    const proteinConsumed = diary.entriesByMeal.breakfast
      .concat(diary.entriesByMeal.lunch, diary.entriesByMeal.dinner, diary.entriesByMeal.snack)
      .reduce((sum, entry) => sum + entry.nutrition.proteinG, 0);
    const proteinTarget = diary.macroTargets.proteinG;
    const proteinDone = proteinTarget > 0 && proteinConsumed >= proteinTarget;

    if (breakfastDone) awardXpOnce(`breakfast-${dateIso}`, BREAKFAST_XP);
    if (proteinDone) awardXpOnce(`protein-${dateIso}`, PROTEIN_XP);

    const tasks: PetTaskItem[] = [
      {
        id: 'breakfast',
        label: 'Ghi bữa sáng',
        xpReward: BREAKFAST_XP,
        progressCurrent: breakfastDone ? 1 : 0,
        progressTarget: 1,
        progressLabel: breakfastDone ? 'Xong' : 'Chưa ghi',
        completed: breakfastDone,
      },
      {
        id: 'protein',
        label: 'Đạt mục tiêu protein',
        xpReward: PROTEIN_XP,
        progressCurrent: proteinConsumed,
        progressTarget: proteinTarget,
        progressLabel: `${proteinConsumed}/${proteinTarget} g`,
        completed: proteinDone,
      },
      {
        id: 'water',
        label: 'Uống đủ nước',
        xpReward: 10,
        progressCurrent: 5,
        progressTarget: 8,
        progressLabel: '5/8 ly',
        completed: false,
      },
    ];

    const { level, xpIntoLevel } = computeLevel();

    return {
      name: 'Bé Mầm',
      level,
      xpIntoLevel,
      xpPerLevel: XP_PER_LEVEL,
      streakDays,
      weekCompletion: [...weekCompletion],
      tasks,
      challenge: { title: '7 ngày Eat Clean', dayCurrent: 4, dayTotal: 7, xpReward: 100 },
      message:
        breakfastDone && proteinDone
          ? 'Hôm nay bạn làm rất tốt!'
          : 'Hôm nay bạn làm rất tốt! Uống thêm nước để Bé Mầm vui hơn nhé.',
    };
  },
};
