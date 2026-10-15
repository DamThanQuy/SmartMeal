import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { badgeService } from '../services/badgeService';

const badgesQueryKey = ['badges'] as const;

export function useBadgesSummary() {
  return useQuery({
    queryKey: badgesQueryKey,
    queryFn: () => badgeService.getBadgesSummary(),
  });
}

export function useUnequipCostume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => badgeService.unequipCostume(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgesQueryKey });
      // Bé Mầm ở màn Pet/Dashboard hiển thị trang phục đang mặc.
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    },
  });
}

export function useEquipCostume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (costumeId: string) => badgeService.equipCostume(costumeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    },
  });
}
