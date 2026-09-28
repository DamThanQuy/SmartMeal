import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { healthConnectService } from '../services/healthConnectService';
import type { HealthConnectSourceId } from '../types/profile.types';

const HEALTH_CONNECT_QUERY_KEY = ['health-connect'] as const;

export function useHealthConnectStatus() {
  return useQuery({
    queryKey: HEALTH_CONNECT_QUERY_KEY,
    queryFn: () => healthConnectService.getStatus(),
  });
}

function useInvalidateHealthConnect() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: HEALTH_CONNECT_QUERY_KEY });
}

export function useToggleHealthConnectSource() {
  const invalidate = useInvalidateHealthConnect();
  return useMutation({
    mutationFn: (sourceId: HealthConnectSourceId) => healthConnectService.toggleSource(sourceId),
    onSuccess: invalidate,
  });
}

export function useSyncHealthConnect() {
  const invalidate = useInvalidateHealthConnect();
  return useMutation({
    mutationFn: () => healthConnectService.syncNow(),
    onSuccess: invalidate,
  });
}

export function useDisconnectHealthConnect() {
  const invalidate = useInvalidateHealthConnect();
  return useMutation({
    mutationFn: () => healthConnectService.disconnect(),
    onSuccess: invalidate,
  });
}

export function useConnectHealthConnect() {
  const invalidate = useInvalidateHealthConnect();
  return useMutation({
    mutationFn: () => healthConnectService.connect(),
    onSuccess: invalidate,
  });
}
