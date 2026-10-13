import NetInfo, { useNetInfo, type NetInfoState } from '@react-native-community/netinfo';
import { isOfflineDevOverrideActive, useAppStore } from '@/state/app/appStore';

// Trạng thái mạng cho hàng đợi offline (BR-261/262). `isConnected === null` (chưa biết) coi là có
// mạng — gửi thử, lỗi mạng thật thì request tự rơi vào hàng đợi. Màn Dev "Offline" ép mất mạng để thử.

function isStateOnline(state: Pick<NetInfoState, 'isConnected'>): boolean {
  return state.isConnected !== false;
}

export async function isOnlineNow(): Promise<boolean> {
  if (isOfflineDevOverrideActive()) return false;
  try {
    return isStateOnline(await NetInfo.fetch());
  } catch {
    return true;
  }
}

/** Gọi `listener` mỗi khi có mạng trở lại (kể cả tắt mô phỏng offline ở màn Dev). */
export function subscribeOnline(listener: () => void): () => void {
  let wasOnline = true;
  const notify = (online: boolean) => {
    if (online && !wasOnline) listener();
    wasOnline = online;
  };
  const unsubscribeNet = NetInfo.addEventListener(state => notify(isStateOnline(state) && !isOfflineDevOverrideActive()));
  const unsubscribeDev = useAppStore.subscribe((state, previous) => {
    if (previous.isOfflineDevOverride && !state.isOfflineDevOverride) listener();
  });
  return () => {
    unsubscribeNet();
    unsubscribeDev();
  };
}

export function useIsOnline(): boolean {
  const netInfo = useNetInfo();
  const devOffline = useAppStore(state => state.isOfflineDevOverride);
  return !devOffline && isStateOnline(netInfo);
}
