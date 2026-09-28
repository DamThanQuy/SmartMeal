import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { waterService } from '../services/waterService';

const waterDayQueryKey = (dateIso: string) => ['water', dateIso] as const;
const waterWeekQueryKey = (dateIso: string) => ['water', 'week', dateIso] as const;

export function useWaterDay(dateIso: string) {
  return useQuery({
    queryKey: waterDayQueryKey(dateIso),
    queryFn: () => waterService.getDaySummary(dateIso),
  });
}

export function useWaterWeekSummary(dateIso: string) {
  return useQuery({
    queryKey: waterWeekQueryKey(dateIso),
    queryFn: () => waterService.getWeekSummary(dateIso),
  });
}

function useInvalidateWater(dateIso: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: waterDayQueryKey(dateIso) });
    void queryClient.invalidateQueries({ queryKey: waterWeekQueryKey(dateIso) });
    // "Uống đủ nước" ở PetScreen đọc waterService qua gamificationService.getPetState().
    void queryClient.invalidateQueries({ queryKey: ['pet'] });
  };
}

export function useAddWaterEntry(dateIso: string) {
  const invalidate = useInvalidateWater(dateIso);
  return useMutation({
    mutationFn: (amountMl: number) => waterService.addEntry(dateIso, amountMl),
    onSuccess: invalidate,
  });
}

export function useUndoLastWaterEntry(dateIso: string) {
  const invalidate = useInvalidateWater(dateIso);
  return useMutation({
    mutationFn: () => waterService.undoLastEntry(dateIso),
    onSuccess: invalidate,
  });
}

export function useDeleteWaterEntry(dateIso: string) {
  const invalidate = useInvalidateWater(dateIso);
  return useMutation({
    mutationFn: (entryId: string) => waterService.deleteEntry(dateIso, entryId),
    onSuccess: invalidate,
  });
}
