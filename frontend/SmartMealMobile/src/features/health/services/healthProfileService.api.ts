import { ENDPOINTS, api, isApiError } from '@/services/api';
import { getCurrentUserId } from '@/state/auth/authStore';
import type {
  HealthProfileDto,
  HealthSurveyRequest,
  WeightHistoryResponse,
  WeightLogRequest,
  WeightPointDto,
} from '../types/health.api.types';
import type { HealthProfileInput } from '../types/health.types';
import {
  extrasFromSelection,
  fromHealthProfileDto,
  fromWeightHistoryDto,
  hasSameServerSelection,
  profileInputFromForm,
  selectionFromForm,
  toHealthProfileResult,
  toRecordedAtIso,
  toSurveyRequest,
} from './health.mapper';
import type { healthProfileMockService } from './healthProfileService.mock';
import { profileExtrasStorage } from './profileExtrasStorage';

async function postSurvey(input: HealthProfileInput): Promise<HealthProfileDto> {
  return api.post<HealthProfileDto, HealthSurveyRequest>(
    ENDPOINTS.healthProfile.survey,
    toSurveyRequest(input),
  );
}

// Bản gọi backend thật (docs/fetch-api/part1 §6, §9). Chỉ khai báo hàm đã nối API; hàm còn lại tự
// rơi về bản mock trong healthProfileService.ts.
export const healthProfileApiService: Partial<typeof healthProfileMockService> = {
  // POST /healthprofile/survey — BE tính BMI/BMR/TDEE/macro (BR-022) và ghi đè toàn bộ hồ sơ.
  async submitHealthProfile(formData) {
    const dto = await postSurvey(profileInputFromForm(formData));

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

  // GET /healthprofile/weight-history — BE trả cũ → mới, mapper đảo lại mới → cũ.
  async getWeightHistory() {
    const dto = await api.get<WeightHistoryResponse>(ENDPOINTS.healthProfile.weightHistory);
    return fromWeightHistoryDto(dto);
  },

  // POST /healthprofile/weight-log rồi GET /healthprofile: response của weight-log chỉ có điểm
  // cân nặng, chỉ số mới (BMI/BMR/TDEE/macro) do BE tính lại và phải đọc ở GET.
  async recordWeight(input) {
    await api.post<WeightPointDto, WeightLogRequest>(ENDPOINTS.healthProfile.weightLog, {
      weightKg: input.weightKg,
      recordedAt: toRecordedAtIso(input.dateIso),
    });
    const dto = await api.get<HealthProfileDto>(ENDPOINTS.healthProfile.base);
    return fromHealthProfileDto(dto);
  },

  // BE chỉ có "ghi đè toàn bộ hồ sơ" → gửi lại hồ sơ hiện tại kèm phần đổi. Mỗi lần gọi BE thêm 1
  // dòng cân nặng (P1-BE-04). Giữ ngày sinh người dùng vừa nhập (BE chỉ lưu tuổi).
  async updateBasicInfo(update, current) {
    const dto = await postSurvey({ ...current, ...update });
    return { ...fromHealthProfileDto(dto), dateOfBirth: update.dateOfBirth };
  },

  // Chỉ gọi survey khi dị ứng/bệnh lý CÓ id trên BE đổi: chế độ ăn và các mục không có id
  // (treeNut, sesame, other...) chỉ ở máy — khỏi ghi đè hồ sơ và khỏi thêm dòng cân nặng thừa.
  async updateHealthSettings(selection, current) {
    const next: HealthProfileInput = {
      ...current,
      allergyIds: selection.allergyIds,
      healthConditionIds: selection.healthConditionIds,
    };
    const userId = getCurrentUserId();
    const extras = extrasFromSelection(selection);

    if (hasSameServerSelection(current, next)) {
      if (userId) await profileExtrasStorage.save(userId, extras);
      return null;
    }

    const dto = await postSurvey(next);
    if (userId) await profileExtrasStorage.save(userId, extras);
    return fromHealthProfileDto(dto);
  },
};
