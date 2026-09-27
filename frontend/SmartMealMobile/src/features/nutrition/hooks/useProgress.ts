import { useQuery } from '@tanstack/react-query';
import { nutritionService } from '../services/nutritionService';

export function useWeeklyProgress(dateIso: string) {
  return useQuery({
    queryKey: ['progress', dateIso],
    queryFn: () => nutritionService.getWeeklyProgress(dateIso),
  });
}
