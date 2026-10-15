import { useQuery } from '@tanstack/react-query';
import { nutritionService } from '../services/nutritionService';

export function useWeeklyProgress(dateIso: string, enabled = true) {
  return useQuery({
    queryKey: ['progress', dateIso],
    queryFn: () => nutritionService.getWeeklyProgress(dateIso),
    enabled,
  });
}

/** Tab "Tháng" — chỉ tải khi người dùng mở tab (`enabled`). */
export function useMonthlyProgress(dateIso: string, enabled = true) {
  return useQuery({
    queryKey: ['progress', 'month', dateIso],
    queryFn: () => nutritionService.getMonthlyProgress(dateIso),
    enabled,
  });
}
