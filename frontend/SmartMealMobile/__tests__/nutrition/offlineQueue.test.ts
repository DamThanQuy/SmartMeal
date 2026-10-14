import type { NewMealLogInput } from '@/features/nutrition/types/nutrition.types';

const ENTRY: NewMealLogInput = {
  foodName: 'Phở bò',
  servingLabel: '1 tô',
  grams: 500,
  nutrition: { calories: 450, proteinG: 25, carbsG: 60, fatG: 10 },
  source: 'manual',
};

function load() {
  jest.resetModules();
  const store = new Map<string, string>();
  const addLogEntries = jest.fn();
  jest.doMock('@/services/storage/storage', () => ({
    storageService: {
      getString: jest.fn(async (key: string) => store.get(key)),
      setString: jest.fn(async (key: string, value: string) => void store.set(key, value)),
      delete: jest.fn(async (key: string) => void store.delete(key)),
    },
  }));
  jest.doMock('@/features/nutrition/services/nutritionService', () => ({
    nutritionService: { addLogEntries },
  }));
  const queue =
    require('@/features/nutrition/services/offlineQueue') as typeof import('@/features/nutrition/services/offlineQueue');
  const { useOfflineSyncStore, parsePendingQueue } =
    require('@/features/nutrition/state/offlineSyncStore') as typeof import('@/features/nutrition/state/offlineSyncStore');
  const { ApiError } = jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');
  return { ...queue, useOfflineSyncStore, parsePendingQueue, addLogEntries, store, ApiError };
}

describe('hàng đợi offline (F12)', () => {
  test('mục chờ giữ nguyên payload + khóa idempotency hợp lệ với máy chủ; nhãn dễ đọc', () => {
    const { buildPendingMealLog } = load();

    const pending = buildPendingMealLog('2026-10-14', 'lunch', [ENTRY], undefined, new Date(2026, 9, 14, 12, 5));

    expect(pending.idempotencyKey).toMatch(/^[A-Za-z0-9._:-]{1,100}$/);
    expect(pending).toMatchObject({
      dateIso: '2026-10-14',
      mealType: 'lunch',
      entries: [ENTRY],
      label: 'Thêm Phở bò · Bữa trưa',
      timeLabel: '12:05',
    });
  });

  test('gửi lại đúng khóa cũ; thành công thì xoá khỏi hàng đợi và khỏi bộ nhớ máy', async () => {
    const { buildPendingMealLog, flushOfflineQueue, useOfflineSyncStore, addLogEntries, store, parsePendingQueue } =
      load();
    const pending = buildPendingMealLog('2026-10-14', 'lunch', [ENTRY], 'meal-key-1');
    useOfflineSyncStore.getState().enqueue(pending);
    addLogEntries.mockResolvedValue([]);

    await expect(flushOfflineQueue()).resolves.toBe(1);

    expect(addLogEntries).toHaveBeenCalledWith('2026-10-14', 'lunch', [ENTRY], { idempotencyKey: 'meal-key-1' });
    expect(useOfflineSyncStore.getState().pending).toEqual([]);
    expect(parsePendingQueue([...store.values()][0])).toEqual([]);
  });

  test('vẫn mất mạng → dừng, giữ nguyên các mục để lần sau gửi lại', async () => {
    const { buildPendingMealLog, flushOfflineQueue, useOfflineSyncStore, addLogEntries, ApiError } = load();
    useOfflineSyncStore.getState().enqueue(buildPendingMealLog('2026-10-14', 'lunch', [ENTRY], 'k1'));
    useOfflineSyncStore.getState().enqueue(buildPendingMealLog('2026-10-14', 'dinner', [ENTRY], 'k2'));
    addLogEntries.mockRejectedValue(new ApiError('Mất mạng', 'NETWORK'));

    await expect(flushOfflineQueue()).resolves.toBe(0);

    expect(addLogEntries).toHaveBeenCalledTimes(1);
    expect(useOfflineSyncStore.getState().pending.map(item => item.idempotencyKey)).toEqual(['k1', 'k2']);
  });

  test('máy chủ từ chối (lỗi nghiệp vụ) → đánh dấu lỗi, không gửi lại tự động, mục sau vẫn được gửi', async () => {
    const { buildPendingMealLog, flushOfflineQueue, useOfflineSyncStore, addLogEntries, ApiError } = load();
    useOfflineSyncStore.getState().enqueue(buildPendingMealLog('2026-10-14', 'lunch', [ENTRY], 'k1'));
    useOfflineSyncStore.getState().enqueue(buildPendingMealLog('2026-10-14', 'dinner', [ENTRY], 'k2'));
    addLogEntries
      .mockRejectedValueOnce(new ApiError('Dữ liệu không hợp lệ', 'BUSINESS', 400))
      .mockResolvedValueOnce([]);

    await expect(flushOfflineQueue()).resolves.toBe(1);
    expect(useOfflineSyncStore.getState().pending).toEqual([
      expect.objectContaining({ idempotencyKey: 'k1', errorMessage: 'Dữ liệu không hợp lệ' }),
    ]);

    addLogEntries.mockClear();
    await flushOfflineQueue();
    expect(addLogEntries).not.toHaveBeenCalled();
  });

  test('hàng đợi lưu theo tài khoản: nạp lại sau khi mở app; dữ liệu hỏng thì bỏ qua', async () => {
    const { buildPendingMealLog, useOfflineSyncStore, parsePendingQueue } = load();
    useOfflineSyncStore.getState().enqueue(buildPendingMealLog('2026-10-14', 'lunch', [ENTRY], 'k1'));
    useOfflineSyncStore.getState().clearMemory();
    await new Promise(resolve => setTimeout(resolve, 0));

    await useOfflineSyncStore.getState().hydrate();

    expect(useOfflineSyncStore.getState().pending.map(item => item.idempotencyKey)).toEqual(['k1']);
    expect(parsePendingQueue('{hỏng')).toEqual([]);
    expect(parsePendingQueue(JSON.stringify([{ idempotencyKey: 1 }]))).toEqual([]);
  });
});
