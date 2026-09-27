import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { RegisterPayload } from '../types/auth.types';

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
  });
}
