import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { ForgotPasswordPayload } from '../types/auth.types';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      authService.requestPasswordReset(payload),
  });
}
