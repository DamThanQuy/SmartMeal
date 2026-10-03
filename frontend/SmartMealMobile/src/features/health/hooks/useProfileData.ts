import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { extrasFromSelection } from '../services/health.mapper';
import { healthProfileService } from '../services/healthProfileService';
import type {
  BasicInfoUpdate,
  HealthProfileInput,
  HealthProfileSnapshot,
  HealthSelection,
  WeightRecordInput,
} from '../types/health.types';

// Sửa hồ sơ sức khỏe sau khi đã đăng nhập (WeightHistory, EditProfile, HealthSettings): hook đọc hồ
// sơ hiện tại từ userProfileStore, gọi healthProfileService, rồi nạp kết quả (số liệu do BE tính)
// lại vào store — store luôn là bản sao đồng bộ của server (docs/fetch-api/part1 §6.5).

export const WEIGHT_HISTORY_QUERY_KEY = ['weight-history'] as const;

function currentProfileInput(): HealthProfileInput {
  const state = useUserProfileStore.getState();
  return {
    gender: state.gender,
    dateOfBirth: state.dateOfBirth,
    heightCm: state.heightCm,
    weightKg: state.weightKg,
    goalWeightKg: state.goalWeightKg,
    activityLevel: state.activityLevel,
    goal: state.goal,
    allergyIds: state.allergyIds,
    healthConditionIds: state.healthConditionIds,
  };
}

function currentSelection(): HealthSelection {
  const state = useUserProfileStore.getState();
  return {
    allergyIds: state.allergyIds,
    healthConditionIds: state.healthConditionIds,
    dietaryPreferenceIds: state.dietaryPreferenceIds,
  };
}

/** Nạp snapshot mới vào store, giữ phần lựa chọn BE không lưu (chế độ ăn, mục không có id). */
function applySnapshot(snapshot: HealthProfileSnapshot, selection: HealthSelection): void {
  useUserProfileStore.getState().hydrateFromServer(snapshot, extrasFromSelection(selection));
}

// Mục tiêu calo/macro đổi theo cân nặng/chiều cao/tuổi nên mọi nơi đang dùng chúng phải tải lại
// (docs/fetch-api/part1 §7.7). Chỉ các query đang hiển thị mới gọi lại ngay.
const QUERY_KEYS_USING_CALORIE_TARGET = [
  WEIGHT_HISTORY_QUERY_KEY[0],
  'diary',
  'dashboard',
  'progress',
  'meal-plan',
] as const;

function useInvalidateAfterBodyChange() {
  const queryClient = useQueryClient();
  return () => {
    QUERY_KEYS_USING_CALORIE_TARGET.forEach(key => {
      void queryClient.invalidateQueries({ queryKey: [key] });
    });
  };
}

export function useWeightHistory() {
  return useQuery({
    queryKey: WEIGHT_HISTORY_QUERY_KEY,
    queryFn: () => healthProfileService.getWeightHistory(),
  });
}

export function useRecordWeight() {
  const invalidate = useInvalidateAfterBodyChange();
  return useMutation({
    mutationFn: (input: WeightRecordInput) =>
      healthProfileService.recordWeight(input, currentProfileInput()),
    onSuccess: snapshot => {
      applySnapshot(snapshot, currentSelection());
      invalidate();
    },
  });
}

export function useUpdateBasicInfo() {
  const invalidate = useInvalidateAfterBodyChange();
  return useMutation({
    mutationFn: (update: BasicInfoUpdate) =>
      healthProfileService.updateBasicInfo(update, currentProfileInput()),
    onSuccess: snapshot => {
      applySnapshot(snapshot, currentSelection());
      invalidate();
    },
  });
}

export function useUpdateHealthSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (selection: HealthSelection) => ({
      selection,
      snapshot: await healthProfileService.updateHealthSettings(selection, currentProfileInput()),
    }),
    onSuccess: ({ selection, snapshot }) => {
      if (snapshot) {
        applySnapshot(snapshot, selection);
      } else {
        // Không có gì đổi ở phía BE (chỉ chế độ ăn hoặc mục chỉ lưu ở máy) → chỉ áp lựa chọn.
        const store = useUserProfileStore.getState();
        store.setAllergyIds(selection.allergyIds);
        store.setHealthConditionIds(selection.healthConditionIds);
        store.setDietaryPreferenceIds(selection.dietaryPreferenceIds);
      }
      // Dị ứng/bệnh lý đổi ảnh hưởng gợi ý công thức, thực đơn, cảnh báo sản phẩm... — làm mới mọi
      // query đang hiển thị thay vì liệt kê từng key của các feature khác.
      void queryClient.invalidateQueries();
    },
  });
}
