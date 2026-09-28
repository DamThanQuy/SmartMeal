import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { badgeService } from '../services/badgeService';

const badgesQueryKey = ['badges'] as const;

export function useBadgesSummary() {
  return useQuery({
    queryKey: badgesQueryKey,
    queryFn: () => badgeService.getBadgesSummary(),
  });
}

export function useEquipCostume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (costumeId: string) => badgeService.equipCostume(costumeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgesQueryKey });
    },
  });
}
