import { useQuery } from '@tanstack/react-query';
import { metaService } from '../services/metaService';

// Danh mục /meta/* (dị ứng, bệnh lý, tag) seed cố định ở BE nên gần như không đổi → cache 24 giờ.
const META_STALE_TIME_MS = 24 * 60 * 60 * 1000;

export const metaQueryKeys = {
  allergies: ['meta', 'allergies'] as const,
  medicalConditions: ['meta', 'medical-conditions'] as const,
  tags: ['meta', 'tags'] as const,
};

export function useAllergies(enabled = true) {
  return useQuery({
    queryKey: metaQueryKeys.allergies,
    queryFn: () => metaService.getAllergies(),
    staleTime: META_STALE_TIME_MS,
    enabled,
  });
}

export function useMedicalConditions(enabled = true) {
  return useQuery({
    queryKey: metaQueryKeys.medicalConditions,
    queryFn: () => metaService.getMedicalConditions(),
    staleTime: META_STALE_TIME_MS,
    enabled,
  });
}

export function useTags(enabled = true) {
  return useQuery({
    queryKey: metaQueryKeys.tags,
    queryFn: () => metaService.getTags(),
    staleTime: META_STALE_TIME_MS,
    enabled,
  });
}
