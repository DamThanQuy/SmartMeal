import { useQuery } from '@tanstack/react-query';
import { todayIso } from '@/features/nutrition';
import { dashboardService } from '../services/dashboardService';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', todayIso()],
    queryFn: () => dashboardService.getDashboardSummary(),
  });
}
