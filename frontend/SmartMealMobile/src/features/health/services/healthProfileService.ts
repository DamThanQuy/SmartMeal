import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { calculateHealthProfileResult } from './healthCalculator';
import type {
  Gender,
  HealthGoal,
  HealthProfileFormData,
  HealthProfileResult,
} from '../types/health.types';

// TODO: replace mock with real API (BR-020, BR-022 — tính toán sẽ do Backend đảm nhiệm)

function toDate(dateOfBirth: HealthProfileFormData['dateOfBirth']): Date {
  const day = Number(dateOfBirth.day);
  const month = Number(dateOfBirth.month);
  const year = Number(dateOfBirth.year);
  return new Date(year, month - 1, day);
}

export const healthProfileService = {
  // BR-020, BR-021→BR-024, BR-030 — nộp toàn bộ 7 bước, trả kết quả tính sẵn cho HealthResult.
  async submitHealthProfile(formData: HealthProfileFormData): Promise<HealthProfileResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể lưu hồ sơ sức khỏe, vui lòng thử lại.');
    }

    return calculateHealthProfileResult({
      gender: (formData.gender ?? 'other') as Gender,
      dateOfBirth: toDate(formData.dateOfBirth),
      heightCm: Number(formData.heightCm),
      weightKg: Number(formData.weightKg),
      activityLevel: formData.activityLevel ?? 'sedentary',
      goal: (formData.goal ?? 'maintain') as HealthGoal,
    });
  },
};
