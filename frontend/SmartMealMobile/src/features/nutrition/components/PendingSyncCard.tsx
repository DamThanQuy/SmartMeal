import { Clock, TriangleAlert, WifiOff } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppBadge, AppButton, AppCard, AppText } from '@/components/ui';
import { useIsOnline } from '@/services/network/connectivity';
import { useTheme } from '@/theme/ThemeProvider';
import { useSyncOfflineQueueNow } from '../hooks/useOfflineReplay';
import { useOfflineSyncStore } from '../state/offlineSyncStore';

// design/StateOffline.dc.html (BR-261/262) — các lần ghi món chưa tới máy chủ. Tự gửi lại khi có mạng
// (useOfflineReplay); mục máy chủ từ chối thì hiện lý do để người dùng bỏ đi.
export function PendingSyncCard() {
  const { colors } = useTheme();
  const isOnline = useIsOnline();
  const pending = useOfflineSyncStore(state => state.pending);
  const remove = useOfflineSyncStore(state => state.remove);
  const syncNow = useSyncOfflineQueueNow();

  if (pending.length === 0) return null;
  const hasRetryable = pending.some(item => !item.errorMessage);

  return (
    <AppCard className="gap-xs">
      <View className="flex-row items-center justify-between pb-xxs">
        <AppText variant="h3">{`Chờ đồng bộ (${pending.length})`}</AppText>
        {isOnline ? null : (
          <AppBadge label="Cần kết nối mạng" tone="warning" icon={<WifiOff size={12} color={colors.warningText} />} />
        )}
      </View>
      {pending.map(item => (
        <View key={item.idempotencyKey} className="gap-xxs border-t border-border py-xs">
          <View className="flex-row items-center gap-sm">
            {item.errorMessage ? (
              <TriangleAlert size={18} color={colors.error} />
            ) : (
              <Clock size={18} color={colors.textSecondary} />
            )}
            <AppText variant="body" className="flex-1">
              {item.label}
            </AppText>
            <AppText variant="caption" color="secondary">
              {item.timeLabel}
            </AppText>
          </View>
          {item.errorMessage ? (
            <View className="flex-row items-center gap-sm pl-xl">
              <AppText variant="caption" color="error" className="flex-1">
                {`Không lưu được: ${item.errorMessage}`}
              </AppText>
              <AppButton label="Bỏ" variant="outline" onPress={() => remove(item.idempotencyKey)} className="h-[36px] px-sm" />
            </View>
          ) : null}
        </View>
      ))}
      {hasRetryable ? (
        <AppButton
          label="Đồng bộ ngay"
          variant="secondary"
          disabled={!isOnline}
          loading={syncNow.isPending}
          onPress={() => syncNow.mutate()}
          className="mt-xs"
        />
      ) : null}
      <AppText variant="caption" color="secondary">
        Mỗi thao tác được gửi kèm mã riêng nên gửi lại khi có mạng sẽ không tạo bản ghi trùng.
      </AppText>
    </AppCard>
  );
}
