import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { HEALTH_CONNECT_STATE_MOCK } from '../mocks/healthConnect.mock';
import type { HealthConnectSourceId, HealthConnectState } from '../types/profile.types';

// TODO: replace mock with real API — Health Connect/HealthKit thật cần Expo Dev Client
// (docs/structure_system.md §2/§11), tạm mô phỏng bằng in-memory store + nút "Đồng bộ ngay".
const state: HealthConnectState = {
  ...HEALTH_CONNECT_STATE_MOCK,
  sources: HEALTH_CONNECT_STATE_MOCK.sources.map(source => ({ ...source })),
};

export const healthConnectService = {
  async getStatus(): Promise<HealthConnectState> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải trạng thái Health Connect, vui lòng thử lại.');
    }
    return { ...state, sources: state.sources.map(source => ({ ...source })) };
  },

  async toggleSource(sourceId: HealthConnectSourceId): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }
    const source = state.sources.find(candidate => candidate.id === sourceId);
    if (source) source.enabled = !source.enabled;
  },

  // "Đồng bộ ngay" (design/HealthConnect.dc.html) — mô phỏng đồng bộ, cập nhật mốc thời gian.
  async syncNow(): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể đồng bộ, vui lòng thử lại.');
    }
    state.lastSyncedLabel = 'Vừa xong';
  },

  async disconnect(): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể ngắt kết nối, vui lòng thử lại.');
    }
    state.connected = false;
  },

  async connect(): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể kết nối, vui lòng thử lại.');
    }
    state.connected = true;
    state.lastSyncedLabel = 'Vừa xong';
  },
};
