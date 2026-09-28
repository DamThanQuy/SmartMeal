import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import type { MealType } from '@/types/meal.types';
import { REMINDERS_SETTINGS_MOCK } from '../mocks/reminders.mock';
import type { OtherReminderId, RemindersSettings } from '../types/profile.types';

// TODO: replace mock with real API — in-memory store mô phỏng Backend, theo đúng pattern
// nutritionService (CLAUDE.md mục 8).
const state: RemindersSettings = {
  ...REMINDERS_SETTINGS_MOCK,
  meals: REMINDERS_SETTINGS_MOCK.meals.map(meal => ({ ...meal })),
  water: { ...REMINDERS_SETTINGS_MOCK.water },
  other: REMINDERS_SETTINGS_MOCK.other.map(item => ({ ...item })),
};

export const remindersService = {
  async getReminders(): Promise<RemindersSettings> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải cài đặt nhắc nhở, vui lòng thử lại.');
    }
    return { ...state, meals: state.meals.map(meal => ({ ...meal })), other: state.other.map(item => ({ ...item })) };
  },

  async toggleMealReminder(mealType: MealType): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }
    const meal = state.meals.find(item => item.mealType === mealType);
    if (meal) meal.enabled = !meal.enabled;
  },

  async toggleWaterReminder(): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }
    state.water.enabled = !state.water.enabled;
  },

  async toggleOtherReminder(id: OtherReminderId): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }
    const item = state.other.find(candidate => candidate.id === id);
    if (item) item.enabled = !item.enabled;
  },
};
