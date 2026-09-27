/**
 * Cấu hình mock cho nhánh feat/mock-ui (CLAUDE.md mục 8). Mọi feature service mock đọc
 * scenario hiện tại qua state/app/appStore (getCurrentMockScenario) để trả dữ liệu/lỗi/độ
 * trễ phù hợp — đổi scenario bằng công tắc trong màn Dev (ThemePreviewScreen).
 */
export type MockScenario = 'success' | 'empty' | 'error' | 'slow';

export const MOCK_SCENARIOS: MockScenario[] = ['success', 'empty', 'error', 'slow'];

export const DEFAULT_MOCK_SCENARIO: MockScenario = 'success';

const MOCK_DELAY_RANGE_MS: Record<MockScenario, readonly [number, number]> = {
  success: [400, 800],
  empty: [400, 800],
  error: [400, 800],
  slow: [2500, 3500],
};

/** Random hoá trong khoảng 400–800ms (hoặc dài hơn cho scenario 'slow') theo CLAUDE.md mục 8. */
export function getMockDelayMs(scenario: MockScenario): number {
  const [min, max] = MOCK_DELAY_RANGE_MS[scenario];
  return Math.round(min + Math.random() * (max - min));
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
