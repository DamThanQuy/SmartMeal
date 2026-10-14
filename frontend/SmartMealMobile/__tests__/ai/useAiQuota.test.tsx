/**
 * useAiQuota (BR-233): hạn mức AI đọc từ server (GET /ai/quota) qua TanStack Query. Chưa đọc được thì
 * không chặn người dùng; consumeQuota ghi nhận lượt rồi đọc lại hạn mức. Service được mock.
 */
import { AI_QUOTA_QUERY_KEY } from '@/constants/queryKeys';
import { useAiQuota } from '@/features/ai/hooks/useAiQuota';
import { aiService } from '@/features/ai/services/aiService';
import { usePremiumStore } from '@/state/premium/premiumStore';
import { renderHookWithQuery } from '../../test-utils/renderHookWithQuery';

jest.mock('@/features/ai/services/aiService', () => ({
  aiService: { getQuota: jest.fn(), recordUsage: jest.fn() },
}));

const service = aiService as jest.Mocked<typeof aiService>;

const FREE_QUOTA = {
  isUnlimited: false,
  limit: 5,
  used: 2,
  remaining: 3,
  resetsAtIso: '2026-10-03T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.getState().resetToFree();
  service.recordUsage.mockResolvedValue(undefined);
});

describe('useAiQuota', () => {
  test('Free: số lượt từ server, còn lượt thì dùng được', async () => {
    service.getQuota.mockResolvedValue(FREE_QUOTA);
    const hook = await renderHookWithQuery(() => useAiQuota());

    await hook.flush();

    expect(hook.current).toMatchObject({
      isUnlimited: false,
      usedToday: 2,
      remaining: 3,
      limit: 5,
      hasRemaining: true,
    });
    expect(hook.current.resetTimeLabel).toMatch(/^\d{2}:\d{2}$/);
    await hook.unmount();
  });

  test('hết lượt (remaining = 0) → hasRemaining = false', async () => {
    service.getQuota.mockResolvedValue({ ...FREE_QUOTA, used: 5, remaining: 0 });
    const hook = await renderHookWithQuery(() => useAiQuota());

    await hook.flush();

    expect(hook.current.hasRemaining).toBe(false);
    await hook.unmount();
  });

  test('Pro: không giới hạn, luôn còn lượt', async () => {
    service.getQuota.mockResolvedValue({
      isUnlimited: true,
      limit: null,
      used: 30,
      remaining: null,
      resetsAtIso: FREE_QUOTA.resetsAtIso,
    });
    const hook = await renderHookWithQuery(() => useAiQuota());

    await hook.flush();

    expect(hook.current.isUnlimited).toBe(true);
    expect(hook.current.hasRemaining).toBe(true);
    await hook.unmount();
  });

  test('chưa đọc được hạn mức (lỗi mạng): Free vẫn không bị chặn, Pro vẫn là không giới hạn theo gói', async () => {
    service.getQuota.mockRejectedValue(new Error('mất mạng'));
    const hook = await renderHookWithQuery(() => useAiQuota());

    await hook.flush();

    expect(hook.current).toMatchObject({ isUnlimited: false, hasRemaining: true, limit: 5, remaining: 5 });
    await hook.unmount();

    usePremiumStore.getState().hydrateMembership({ status: 'premium', planId: 'monthly', expiresAtIso: '2099-01-01' });
    const proHook = await renderHookWithQuery(() => useAiQuota());
    await proHook.flush();
    expect(proHook.current.isUnlimited).toBe(true);
    await proHook.unmount();
  });

  test('consumeQuota: ghi nhận lượt rồi đọc lại hạn mức từ server', async () => {
    service.getQuota.mockResolvedValue(FREE_QUOTA);
    const hook = await renderHookWithQuery(() => useAiQuota());
    await hook.flush();
    const invalidate = jest.spyOn(hook.queryClient, 'invalidateQueries');

    service.getQuota.mockResolvedValue({ ...FREE_QUOTA, used: 3, remaining: 2 });
    hook.current.consumeQuota();
    await hook.flush();

    expect(service.recordUsage).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AI_QUOTA_QUERY_KEY });
    expect(hook.current.remaining).toBe(2);
    await hook.unmount();
  });
});
