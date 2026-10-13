import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { selectService } from '@/services/api';
import { mealPlannerApiService } from './mealPlannerService.api';
import { mealPlannerMockService } from './mealPlannerService.mock';

// Hook/screen chỉ import `mealPlannerService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock hay
// gọi backend thật (xem serviceSelector.ts).
export const mealPlannerService = selectService('mealPlannerService', mealPlannerMockService, mealPlannerApiService);

/** Thứ Hai của tuần hiện tại (giờ máy), yyyy-MM-dd. */
export function currentWeekStartIso(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function shiftWeek(weekStartIso: string, direction: 1 | -1): string {
  const base = new Date(weekStartIso);
  return format(direction === 1 ? addWeeks(base, 1) : subWeeks(base, 1), 'yyyy-MM-dd');
}
