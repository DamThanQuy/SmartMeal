import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { LoginPayload } from '../types/auth.types';

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
  });
}
