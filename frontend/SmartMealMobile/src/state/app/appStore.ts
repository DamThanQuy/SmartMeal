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
//
// AsyncStorage là bất đồng bộ (khác MMKV) nên không thể đọc giá trị lưu trước đó ngay lúc tạo
// store — khởi tạo với DEFAULT_MOCK_SCENARIO rồi hydrate lại bằng hydrateMockScenario() (gọi 1 lần
// lúc App khởi động). Đây chỉ là công tắc dev/QA (không phải dữ liệu người dùng) nên không cần
// chặn màn hình chờ hydrate xong như theme mode.
export const useAppStore = create<AppState>()(set => ({
  mockScenario: DEFAULT_MOCK_SCENARIO,
  setMockScenario: scenario => {
    void storageService.setString(STORAGE_KEYS.MOCK_SCENARIO, scenario);
    set({ mockScenario: scenario });
  },
}));

/** Đọc lại mock scenario đã lưu từ AsyncStorage — gọi 1 lần lúc App khởi động. */
export async function hydrateMockScenario(): Promise<void> {
  const stored = await storageService.getString(STORAGE_KEYS.MOCK_SCENARIO);
  if (isMockScenario(stored)) {
    useAppStore.setState({ mockScenario: stored });
  }
}

/** Đọc scenario hiện tại ngoài React tree (trong service, không dùng hook được). */
export function getCurrentMockScenario(): MockScenario {
  return useAppStore.getState().mockScenario;
}
