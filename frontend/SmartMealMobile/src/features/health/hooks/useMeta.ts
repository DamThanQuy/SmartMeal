import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ENV } from '@/config/env';
import { metaService } from '../services/metaService';
import { verifyMetaMapping } from '../utils/metaMapping';

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

/**
 * Chỉ ở dev: đối chiếu bảng id cứng (utils/metaMapping.ts) với /meta/* thật và cảnh báo nếu DB bị
 * seed lại — gửi sai id nghĩa là lưu sai dị ứng/bệnh lý của người dùng. Không chặn luồng, không
 * hiện UI (docs/fetch-api/part1 §6.4). Gọi ở màn bắt đầu wizard và màn sửa dị ứng/bệnh lý.
 */
export function useMetaMappingCheck(): void {
  const enabled = __DEV__ && !ENV.useMockApi;
  const { data: allergies } = useAllergies(enabled);
  const { data: conditions } = useMedicalConditions(enabled);

  useEffect(() => {
    if (!allergies || !conditions) return;
    const problems = verifyMetaMapping(allergies, conditions);
    if (problems.length > 0) {
      console.warn(`[meta] Bảng quy đổi id lệch với backend:\n- ${problems.join('\n- ')}`);
    }
  }, [allergies, conditions]);
}
