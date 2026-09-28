import { addDays, format, subDays } from 'date-fns';
import { todayIso } from '@/features/nutrition';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { getWaterGoalMl } from '@/state/user/userProfileStore';
import { createTodayWaterEntriesMock, HISTORICAL_WATER_ML } from '../mocks/water.mock';
import type {
  WaterDaySummary,
  WaterEntry,
  WaterHistoryDay,
  WaterWeekSummary,
} from '../types/water.types';

// TODO: replace mock with real API — theo đúng pattern nutritionService (in-memory store mô
// phỏng Backend cho nhánh feat/mock-ui).

export const CUP_ML = 250;
/** date-fns Date.getDay(): 0=CN...6=T7. */
const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const waterByDate = new Map<string, WaterEntry[]>();
let entryIdCounter = 0;
function nextEntryId(): string {
  entryIdCounter += 1;
  return `water-${Date.now()}-${entryIdCounter}`;
}

function getOrSeedDay(dateIso: string): WaterEntry[] {
  const existing = waterByDate.get(dateIso);
  if (existing) return existing;
  const seeded =
    dateIso === todayIso()
      ? createTodayWaterEntriesMock().map(entry => ({ ...entry, id: nextEntryId() }))
      : [];
  waterByDate.set(dateIso, seeded);
  return seeded;
}

function sumMl(entries: WaterEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amountMl, 0);
}

export const waterService = {
  async getDaySummary(dateIso: string): Promise<WaterDaySummary> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải dữ liệu uống nước, vui lòng thử lại.');
    }
    const entries = scenario === 'empty' ? [] : getOrSeedDay(dateIso);
    return { dateIso, entries, totalMl: sumMl(entries), goalMl: getWaterGoalMl() };
  },

  async addEntry(dateIso: string, amountMl: number): Promise<WaterEntry> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể ghi nước, vui lòng thử lại.');
    }
    const entry: WaterEntry = { id: nextEntryId(), amountMl, timeLabel: format(new Date(), 'HH:mm') };
    const day = getOrSeedDay(dateIso);
    waterByDate.set(dateIso, [...day, entry]);
    return entry;
  },

  // "Hoàn tác" (design/WaterLog.dc.html) — xóa lần ghi gần nhất trong ngày.
  async undoLastEntry(dateIso: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể hoàn tác, vui lòng thử lại.');
    }
    const day = getOrSeedDay(dateIso);
    if (day.length === 0) return;
    waterByDate.set(dateIso, day.slice(0, -1));
  },

  async deleteEntry(dateIso: string, entryId: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể xóa, vui lòng thử lại.');
    }
    const day = getOrSeedDay(dateIso);
    waterByDate.set(
      dateIso,
      day.filter(entry => entry.id !== entryId),
    );
  },

  // design/WaterLog.dc.html "7 ngày qua".
  async getWeekSummary(dateIso: string): Promise<WaterWeekSummary> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải lịch sử uống nước, vui lòng thử lại.');
    }

    const goalMl = getWaterGoalMl();
    const startDate = subDays(new Date(dateIso), HISTORICAL_WATER_ML.length);
    const historicalDays: WaterHistoryDay[] = HISTORICAL_WATER_ML.map((totalMl, index) => {
      const date = addDays(startDate, index);
      return {
        dateIso: format(date, 'yyyy-MM-dd'),
        label: WEEKDAY_SHORT_LABELS[date.getDay()],
        totalMl: scenario === 'empty' ? 0 : totalMl,
        goalMl,
      };
    });
    const todayEntries = scenario === 'empty' ? [] : getOrSeedDay(dateIso);
    const today = new Date(dateIso);
    const days: WaterHistoryDay[] = [
      ...historicalDays,
      {
        dateIso,
        label: WEEKDAY_SHORT_LABELS[today.getDay()],
        totalMl: sumMl(todayEntries),
        goalMl,
        isToday: true,
      },
    ];
    return { days, daysOnTarget: days.filter(day => day.totalMl >= day.goalMl).length };
  },
};

// BR-271 — DeleteDataScreen: xóa lịch sử uống nước (xem src/state/resetUserData.ts).
registerUserDataReset('water', () => waterByDate.clear());
