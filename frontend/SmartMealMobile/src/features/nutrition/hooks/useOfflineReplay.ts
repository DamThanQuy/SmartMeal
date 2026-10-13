import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isOnlineNow, subscribeOnline } from '@/services/network/connectivity';
import { flushOfflineQueue } from '../services/offlineQueue';
import { useOfflineSyncStore } from '../state/offlineSyncStore';

/**
 * Gắn một lần khi đã đăng nhập (MainNavigator): nạp hàng đợi offline đã lưu của tài khoản, gửi ngay nếu
 * có mạng và gửi lại mỗi khi mạng trở lại. Xong thì làm mới nhật ký/tiến độ/Dashboard.
 */
function useInvalidateAfterSync() {
  const queryClient = useQueryClient();
  return (synced: number) => {
    if (synced === 0) return;
    void queryClient.invalidateQueries({ queryKey: ['diary'] });
    void queryClient.invalidateQueries({ queryKey: ['progress'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

/** Nút "Đồng bộ ngay" ở Diary. */
export function useSyncOfflineQueueNow() {
  const invalidateAfterSync = useInvalidateAfterSync();
  return useMutation({ mutationFn: flushOfflineQueue, onSuccess: invalidateAfterSync });
}

export function useOfflineReplay() {
  const invalidateAfterSync = useInvalidateAfterSync();

  useEffect(() => {
    let active = true;
    const flush = async () => {
      if (!active || useOfflineSyncStore.getState().pending.length === 0) return;
      invalidateAfterSync(await flushOfflineQueue().catch(() => 0));
    };

    void (async () => {
      await useOfflineSyncStore.getState().hydrate();
      if (await isOnlineNow()) await flush();
    })();
    const unsubscribe = subscribeOnline(() => void flush());
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
