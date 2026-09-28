import { useMutation } from '@tanstack/react-query';
import { healthProfileService } from '../services/healthProfileService';
import type { HealthProfileFormData } from '../types/health.types';

export function useSubmitHealthProfile() {
  return useMutation({
    mutationFn: (formData: HealthProfileFormData) =>
      healthProfileService.submitHealthProfile(formData),
  });
}
