import { MEAL_TYPES } from '@/types/meal.types';
import type { DiaryDaySummary, MealLogEntry } from '../types/nutrition.types';

/** Tìm 1 bản ghi theo id trong cả 4 bữa của một ngày. */
export function findEntryById(diary: DiaryDaySummary, entryId: string): MealLogEntry | undefined {
  return MEAL_TYPES.flatMap(type => diary.entriesByMeal[type]).find(entry => entry.id === entryId);
}
