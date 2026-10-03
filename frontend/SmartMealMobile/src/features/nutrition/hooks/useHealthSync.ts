import { useQuery } from '@tanstack/react-query';
import { healthSyncService } from '../services/healthSyncService';

export const healthSyncDailyQueryKey = (dateIso: string) =>
  ['health-sync', 'daily', dateIso] as const;

/** Số liệu vận động 1 ngày (bước chân, calo tiêu hao) — Dashboard, CalorieBudget, Diary. */
export function useHealthSyncDaily(dateIso: string) {
  return useQuery({
    queryKey: healthSyncDailyQueryKey(dateIso),
    queryFn: () => healthSyncService.getDailySummary(dateIso),
  });
}
