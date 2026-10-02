import { ENDPOINTS, api, isApiError } from '@/services/api';
import { getCurrentUserId } from '@/state/auth/authStore';
import type { HealthProfileDto, HealthSurveyRequest } from '../types/health.api.types';
import {
  extrasFromSelection,
  fromHealthProfileDto,
  profileInputFromForm,
  selectionFromForm,
  toHealthProfileResult,
  toSurveyRequest,
} from './health.mapper';
import type { healthProfileMockService } from './healthProfileService.mock';
import { profileExtrasStorage } from './profileExtrasStorage';

// Bản gọi backend thật (docs/fetch-api/part1 §6). Chỉ khai báo hàm đã nối API; hàm còn lại tự rơi
// về bản mock trong healthProfileService.ts.
export const healthProfileApiService: Partial<typeof healthProfileMockService> = {
  // POST /healthprofile/survey — BE tính BMI/BMR/TDEE/macro (BR-022) và ghi đè toàn bộ hồ sơ.
  async submitHealthProfile(formData) {
    const request = toSurveyRequest(profileInputFromForm(formData));
    const dto = await api.post<HealthProfileDto, HealthSurveyRequest>(
      ENDPOINTS.healthProfile.survey,
      request,
    );

    // Phần BE không lưu (chế độ ăn, dị ứng/bệnh lý không có id) giữ cục bộ theo user.
    const userId = getCurrentUserId();
    if (userId) {
      await profileExtrasStorage.save(userId, extrasFromSelection(selectionFromForm(formData)));
    }

    return toHealthProfileResult(dto);
  },

  // GET /healthprofile — null khi tài khoản chưa làm khảo sát (BE trả 404).
  async getHealthProfile(userId) {
    try {
      const dto = await api.get<HealthProfileDto>(ENDPOINTS.healthProfile.base);
      return {
        snapshot: fromHealthProfileDto(dto),
        extras: await profileExtrasStorage.load(userId),
      };
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') return null;
      throw error;
    }
  },
};
