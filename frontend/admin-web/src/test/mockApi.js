import { vi } from 'vitest'

/**
 * Factory cho vi.mock('…/services/api'): giữ authStorage thật, thay mọi hàm của api bằng vi.fn().
 * Dùng: vi.mock('../../services/api', mockApiModule)
 */
export async function mockApiModule(importOriginal) {
  const actual = await importOriginal()
  const api = Object.fromEntries(Object.keys(actual.api).map((key) => [key, vi.fn()]))
  return { ...actual, api }
}
