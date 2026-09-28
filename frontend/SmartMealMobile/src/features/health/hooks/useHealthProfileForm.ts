import { create } from 'zustand';
import {
  createEmptyHealthProfileFormData,
  type HealthProfileFormData,
  type HealthProfileResult,
} from '../types/health.types';

interface HealthProfileFormState {
  data: HealthProfileFormData;
  result: HealthProfileResult | null;
  updateData: (patch: Partial<HealthProfileFormData>) => void;
  setResult: (result: HealthProfileResult) => void;
  reset: () => void;
}

// State chỉ dùng trong feature health (luồng 7 bước Health Profile) — đặt local trong feature
// theo docs/state-and-api.md thay vì src/state global, vì hiện chưa có feature nào khác đọc
// dữ liệu này. Khi Đợt 7 (HealthSettings/Profile) cần dùng chung cho Recipes/MealPlanner, cân
// nhắc promote sang src/state — xem CLAUDE.md ui-mock-prompts.md Phase 7.
export const useHealthProfileForm = create<HealthProfileFormState>()(set => ({
  data: createEmptyHealthProfileFormData(),
  result: null,
  updateData: patch =>
    set(state => ({ data: { ...state.data, ...patch } })),
  setResult: result => set({ result }),
  reset: () =>
    set({ data: createEmptyHealthProfileFormData(), result: null }),
}));
