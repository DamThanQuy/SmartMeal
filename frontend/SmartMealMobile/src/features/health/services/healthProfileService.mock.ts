import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { todayIso } from '@/utils/date';
import { calculateHealthProfileResult } from './healthCalculator';
import { profileInputFromForm, snapshotFromInput } from './health.mapper';
import {
  EMPTY_PROFILE_EXTRAS,
  type BasicInfoUpdate,
  HealthProfileFormData,
  HealthProfileInput,
  HealthProfileResult,
  HealthSelection,
  HydratedHealthProfile,
  WeightHistoryEntry,
  WeightRecordInput,
} from '../types/health.types';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API=true, hoặc hàm BE chưa hỗ trợ) — bản gọi API thật nằm ở
// healthProfileService.api.ts, healthProfileService.ts chọn giữa hai bản.
// TODO: replace mock with real API (BR-020, BR-022 — tính toán sẽ do Backend đảm nhiệm)

// Lịch sử cân nặng "trên server" (mới → cũ) — khớp design/WeightHistory.dc.html (68,0 kg, mục
// tiêu 62 kg) và hồ sơ mẫu của userProfileStore (68 kg).
const WEIGHT_HISTORY_SEED: WeightHistoryEntry[] = [
  { id: 'weight-seed-4', dateIso: '2026-09-27', weightKg: 68.0 },
  { id: 'weight-seed-3', dateIso: '2026-09-20', weightKg: 68.6 },
  { id: 'weight-seed-2', dateIso: '2026-09-13', weightKg: 69.2 },
  { id: 'weight-seed-1', dateIso: '2026-09-06', weightKg: 69.5 },
];

let weightHistory: WeightHistoryEntry[] = WEIGHT_HISTORY_SEED.map(entry => ({ ...entry }));

let weightHistoryIdCounter = 0;
function addWeightEntry(weightKg: number, dateIso: string): void {
  weightHistoryIdCounter += 1;
  weightHistory = [
    { id: `weight-${Date.now()}-${weightHistoryIdCounter}`, dateIso, weightKg },
    ...weightHistory,
  ];
}

async function simulateRequest(errorMessage: string): Promise<void> {
  const scenario = getCurrentMockScenario();
  await wait(getMockDelayMs(scenario));
  if (scenario === 'error') {
    throw new Error(errorMessage);
  }
}

export const healthProfileMockService = {
  // BR-020, BR-021→BR-024, BR-030 — nộp toàn bộ 7 bước, trả kết quả tính sẵn cho HealthResult.
  async submitHealthProfile(formData: HealthProfileFormData): Promise<HealthProfileResult> {
    await simulateRequest('Không thể lưu hồ sơ sức khỏe, vui lòng thử lại.');

    const input = profileInputFromForm(formData);
    addWeightEntry(input.weightKg, todayIso());
    return calculateHealthProfileResult(input);
  },

  // Nạp hồ sơ đã lưu từ server. Mock: userProfileStore đã có hồ sơ mẫu sẵn nên không có gì để nạp
  // (null = không đụng vào store).
  async getHealthProfile(_userId: string): Promise<HydratedHealthProfile | null> {
    return null;
  },

  // WeightHistoryScreen (BR-001→BR-003) — mới → cũ.
  async getWeightHistory(): Promise<WeightHistoryEntry[]> {
    await simulateRequest('Không thể tải lịch sử cân nặng, vui lòng thử lại.');
    return weightHistory.map(entry => ({ ...entry }));
  },

  // BR-003 — ghi cân nặng mới → tính lại BMI→BMR→TDEE→Calorie→Macro qua đúng 1 công thức
  // (calculateHealthProfileResult) và thêm vào lịch sử.
  async recordWeight(
    input: WeightRecordInput,
    current: HealthProfileInput,
  ): Promise<HydratedHealthProfile> {
    await simulateRequest('Không thể lưu cân nặng, vui lòng thử lại.');

    const next: HealthProfileInput = { ...current, weightKg: input.weightKg };
    addWeightEntry(input.weightKg, input.dateIso);
    return {
      snapshot: snapshotFromInput(next, calculateHealthProfileResult(next)),
      extras: EMPTY_PROFILE_EXTRAS,
    };
  },

  // EditProfileScreen (BR-003) — đổi giới tính/ngày sinh/chiều cao cũng phải tính lại
  // BMI→BMR→TDEE→Calorie→Macro qua đúng calculateHealthProfileResult, giống recordWeight.
  async updateBasicInfo(
    update: BasicInfoUpdate,
    current: HealthProfileInput,
  ): Promise<HydratedHealthProfile> {
    await simulateRequest('Không thể lưu thay đổi, vui lòng thử lại.');

    const next: HealthProfileInput = { ...current, ...update };
    return {
      snapshot: snapshotFromInput(next, calculateHealthProfileResult(next)),
      extras: EMPTY_PROFILE_EXTRAS,
    };
  },

  // HealthSettingsScreen — dị ứng/bệnh lý/chế độ ăn không ảnh hưởng chỉ số đã tính, nên không có
  // hồ sơ mới (null = chỉ áp lựa chọn vào userProfileStore).
  async updateHealthSettings(
    _selection: HealthSelection,
    _current: HealthProfileInput,
  ): Promise<HydratedHealthProfile | null> {
    await simulateRequest('Không thể lưu thay đổi, vui lòng thử lại.');
    return null;
  },

  // WaterLogScreen "Đổi mục tiêu" — mục tiêu nước chỉ là một con số trong hồ sơ, không ảnh hưởng
  // chỉ số đã tính, nên cũng không có hồ sơ mới (null = chỉ áp vào userProfileStore).
  async updateWaterGoal(_waterGoalMl: number): Promise<HydratedHealthProfile | null> {
    await simulateRequest('Không thể lưu mục tiêu nước, vui lòng thử lại.');
    return null;
  },
};

// BR-271 — DeleteDataScreen: hồ sơ sức khỏe/cân nặng về lại giá trị khởi tạo (mô phỏng "xóa dữ
// liệu", vì mock-ui chưa có tài khoản thật để tạo hồ sơ rỗng — xem src/state/resetUserData.ts).
registerUserDataReset('weightHistory', () => {
  weightHistory = WEIGHT_HISTORY_SEED.map(entry => ({ ...entry }));
});
