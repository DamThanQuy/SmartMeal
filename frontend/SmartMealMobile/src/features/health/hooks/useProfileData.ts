import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { healthProfileService } from '../services/healthProfileService';
import type {
  BasicInfoUpdate,
  HealthSelection,
  HydratedHealthProfile,
  WeightRecordInput,
} from '../types/health.types';

// Sửa hồ sơ sức khỏe sau khi đã đăng nhập (WeightHistory, EditProfile, HealthSettings): hook gọi
// healthProfileService rồi nạp kết quả (số liệu do BE tính) lại vào userProfileStore — store luôn là bản sao đồng bộ của server (docs/fetch-api/part1 §6.5).

export const WEIGHT_HISTORY_QUERY_KEY = ['weight-history'] as const;

/** Nạp hồ sơ vừa nhận từ server (số liệu BE tính + phần "Khác" giữ cục bộ) vào store. */
function applyHydrated({ snapshot, extras }: HydratedHealthProfile): void {
  useUserProfileStore.getState().hydrateFromServer(snapshot, extras);
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
    mutationFn: (input: WeightRecordInput) => healthProfileService.recordWeight(input),
    onSuccess: profile => {
      applyHydrated(profile);
      invalidate();
    },
  });
}

export function useUpdateBasicInfo() {
  const invalidate = useInvalidateAfterBodyChange();
  return useMutation({
    mutationFn: (update: BasicInfoUpdate) => healthProfileService.updateBasicInfo(update),
    onSuccess: profile => {
      applyHydrated(profile);
      invalidate();
    },
  });
}

// Mục tiêu nước/ngày nằm trong hồ sơ trên server: đổi xong nạp hồ sơ mới vào store và làm mới nơi
// hiển thị nó (màn Uống nước, nhiệm vụ "Uống đủ nước" của Bé Mầm).
export function useUpdateWaterGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (waterGoalMl: number) => healthProfileService.updateWaterGoal(waterGoalMl),
    onSuccess: profile => {
      applyHydrated(profile);
      void queryClient.invalidateQueries({ queryKey: ['water'] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    },
  });
}

export function useUpdateHealthSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selection: HealthSelection) => healthProfileService.updateHealthSettings(selection),
    onSuccess: profile => {
      applyHydrated(profile);
      // Dị ứng/bệnh lý đổi ảnh hưởng gợi ý công thức, thực đơn, cảnh báo sản phẩm... — làm mới mọi
      // query đang hiển thị thay vì liệt kê từng key của các feature khác.
      void queryClient.invalidateQueries();
    },
  });
}
