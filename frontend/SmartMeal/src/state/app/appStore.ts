import { create } from 'zustand';
import {
  DEFAULT_MOCK_SCENARIO,
  type MockScenario,
} from '@/config/mock';
import { STORAGE_KEYS } from '@/constants/storage';
import { storageService } from '@/services/storage/storage';

export interface AppState {
  /** Scenario mock hiện tại (CLAUDE.md mục 8) — mọi feature service đọc qua getCurrentMockScenario(). */
  mockScenario: MockScenario;
  setMockScenario: (scenario: MockScenario) => void;
}

function isMockScenario(value: string | undefined): value is MockScenario {
  return (
    value === 'success' ||
    value === 'empty' ||
    value === 'error' ||
    value === 'slow'
  );
}

// Global client state (app-level settings) — dùng Zustand theo docs/state-and-api.md.
// mockScenario cần global vì mọi feature service (auth, health, dashboard...) đều đọc nó,
// không phải state riêng của 1 feature.
export const useAppStore = create<AppState>()(set => ({
  mockScenario: (() => {
    const stored = storageService.getString(STORAGE_KEYS.MOCK_SCENARIO);
    return isMockScenario(stored) ? stored : DEFAULT_MOCK_SCENARIO;
  })(),
  setMockScenario: scenario => {
    storageService.setString(STORAGE_KEYS.MOCK_SCENARIO, scenario);
    set({ mockScenario: scenario });
  },
}));

/** Đọc scenario hiện tại ngoài React tree (trong service, không dùng hook được). */
export function getCurrentMockScenario(): MockScenario {
  return useAppStore.getState().mockScenario;
}
