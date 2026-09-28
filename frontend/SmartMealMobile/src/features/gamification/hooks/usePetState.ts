import { useQuery } from '@tanstack/react-query';
import { gamificationService } from '../services/gamificationService';

export function usePetState() {
  return useQuery({
    queryKey: ['pet'],
    queryFn: () => gamificationService.getPetState(),
  });
}
