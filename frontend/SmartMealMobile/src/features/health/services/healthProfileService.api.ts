import { ENDPOINTS, api, isApiError } from '@/services/api';
import { getCurrentUserId } from '@/state/auth/authStore';
import type {
  HealthProfileDto,
  HealthSurveyRequest,
  UpdateHealthProfileRequest,
  WeightHistoryResponse,
  WeightLogRequest,
  WeightPointDto,
} from '../types/health.api.types';
import {
  EMPTY_PROFILE_EXTRAS,
  type HealthProfileExtras,
  type HydratedHealthProfile,
} from '../types/health.types';
import {
  extrasFromSelection,
  fromHealthProfileDto,
  fromWeightHistoryDto,
  profileInputFromForm,
  selectionFromForm,
  toBasicInfoUpdateRequest,
  toHealthProfileResult,
  toRecordedAtIso,
  toSelectionUpdateRequest,
  toSurveyRequest,
} from './health.mapper';
import type { healthProfileMockService } from './healthProfileService.mock';
import { getMetaCatalog } from './metaCatalog';
import type { MetaCatalog } from './metaLookup';
import { profileExtrasStorage } from './profileExtrasStorage';

async function loadLocalExtras(userId: string | null): Promise<HealthProfileExtras> {
  return userId ? profileExtrasStorage.load(userId) : EMPTY_PROFILE_EXTRAS;
}

async function saveLocalExtras(extras: HealthProfileExtras): Promise<void> {
  const userId = getCurrentUserId();
  if (userId) await profileExtrasStorage.save(userId, extras);
}

async function hydrated(
  dto: HealthProfileDto,
  catalog: MetaCatalog,
  userId: string | null = getCurrentUserId(),
): Promise<HydratedHealthProfile> {
  return { snapshot: fromHealthProfileDto(dto, catalog), extras: await loadLocalExtras(userId) };
}

// Bản gọi backend thật (docs/fetch-api/part1 §6, §9). Chỉ khai báo hàm đã nối API; hàm còn lại tự
// rơi về bản mock trong healthProfileService.ts.
export const healthProfileApiService: Partial<typeof healthProfileMockService> = {
  // POST /healthprofile/survey — BE lưu NGÀY SINH, dị ứng, bệnh lý, chế độ ăn và tính BMI/BMR/TDEE/macro
  // (BR-022). Chỉ lựa chọn "Khác" (BE không có mục tương ứng) giữ cục bộ theo user.
  async submitHealthProfile(formData) {
    const catalog = await getMetaCatalog();
    const dto = await api.post<HealthProfileDto, HealthSurveyRequest>(
      ENDPOINTS.healthProfile.survey,
      toSurveyRequest(profileInputFromForm(formData), catalog),
    );
    await saveLocalExtras(extrasFromSelection(selectionFromForm(formData), catalog));
    return toHealthProfileResult(dto);
  },

  // GET /healthprofile — null khi tài khoản chưa làm khảo sát (BE trả 404).
  async getHealthProfile(userId) {
    try {
      const [dto, catalog] = await Promise.all([
        api.get<HealthProfileDto>(ENDPOINTS.healthProfile.base),
        getMetaCatalog(),
      ]);
      return await hydrated(dto, catalog, userId);
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
    const [dto, catalog] = await Promise.all([
      api.get<HealthProfileDto>(ENDPOINTS.healthProfile.base),
      getMetaCatalog(),
    ]);
    return hydrated(dto, catalog);
  },

  // PUT /healthprofile { gender, dateOfBirth, heightCm } — BE sửa đúng các trường đó, tính lại chỉ số
  // và KHÔNG thêm dòng cân nặng (trước đây phải gửi lại cả hồ sơ bằng POST /survey).
  async updateBasicInfo(update) {
    const [dto, catalog] = await Promise.all([
      api.put<HealthProfileDto, UpdateHealthProfileRequest>(
        ENDPOINTS.healthProfile.profile,
        toBasicInfoUpdateRequest(update),
      ),
      getMetaCatalog(),
    ]);
    return hydrated(dto, catalog);
  },

  // PUT /healthprofile { allergyIds, medicalConditionIds, dietaryPreferenceIds } — danh sách rỗng là
  // "xóa hết". Mục "Khác" (BE không có) chỉ lưu ở máy.
  async updateHealthSettings(selection) {
    const catalog = await getMetaCatalog();
    const dto = await api.put<HealthProfileDto, UpdateHealthProfileRequest>(
      ENDPOINTS.healthProfile.profile,
      toSelectionUpdateRequest(selection, catalog),
    );
    const extras = extrasFromSelection(selection, catalog);
    await saveLocalExtras(extras);
    return { snapshot: fromHealthProfileDto(dto, catalog), extras };
  },
};
