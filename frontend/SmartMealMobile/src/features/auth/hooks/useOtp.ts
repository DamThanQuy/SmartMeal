import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { ResendOtpPayload, VerifyOtpPayload } from '../types/auth.types';

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => authService.verifyOtp(payload),
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (payload: ResendOtpPayload) => authService.resendOtp(payload),
  });
}
