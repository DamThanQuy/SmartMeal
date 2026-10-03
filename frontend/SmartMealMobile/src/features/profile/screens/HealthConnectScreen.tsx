import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Activity, CheckCircle2, Info } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorState, InlineBanner, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppSwitch, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import {
  useConnectHealthConnect,
  useDisconnectHealthConnect,
  useHealthConnectStatus,
  useSyncHealthConnect,
  useToggleHealthConnectSource,
} from '../hooks/useHealthConnect';

type Props = NativeStackScreenProps<MainStackParamList, 'HealthConnect'>;

// design/HealthConnect.dc.html. Health Connect thật cần Expo Dev Client (docs/structure_system.md
// §2/§11) — "Kết nối"/"Ngắt kết nối"/bật tắt nguồn là tùy chọn cục bộ; số liệu hôm nay lấy từ
// backend (health-sync). Nút "Đồng bộ ngay" chỉ tạo số liệu mẫu ở DEV (xem healthConnectService).
export function HealthConnectScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useHealthConnectStatus();
  const toggleSource = useToggleHealthConnectSource();
  const syncNow = useSyncHealthConnect();
  const disconnect = useDisconnectHealthConnect();
  const connect = useConnectHealthConnect();

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Health Connect" onBack={() => navigation.goBack()} />
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Health Connect" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Health Connect" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-sm"
      >
        <AppCard className="flex-row items-center gap-sm">
          <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-primary-soft">
            <Activity size={26} color={colors.primary} />
          </View>
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium">Google Health Connect</AppText>
            <AppBadge
              tone={data.connected ? 'primary' : 'neutral'}
              label={data.connected ? 'Đã kết nối' : 'Chưa kết nối'}
              icon={data.connected ? <CheckCircle2 size={14} color={colors.successText} /> : undefined}
            />
          </View>
        </AppCard>

        {data.connected ? (
          <>
            <AppCard className="gap-xxs">
              <AppText variant="h3" className="mb-xxs">
                Dữ liệu được đọc
              </AppText>
              {data.sources.map(source => (
                <View
                  key={source.id}
                  className="flex-row items-center gap-sm border-t border-border py-xs"
                >
                  <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
                    <Activity size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1 gap-xxs">
                    <AppText variant="bodyLg">{source.label}</AppText>
                    <AppText variant="caption" color="secondary">
                      {source.todayValueLabel}
                    </AppText>
                  </View>
                  <AppSwitch
                    accessibilityLabel={source.label}
                    checked={source.enabled}
                    onChange={() => toggleSource.mutate(source.id)}
                  />
                </View>
              ))}
            </AppCard>

            <AppCard className="gap-md">
              <View className="flex-row items-center justify-between">
                <View className="gap-xxs">
                  <AppText variant="bodyMedium">Đồng bộ gần nhất</AppText>
                  <AppText variant="caption" color="secondary">
                    {data.lastSyncedLabel}
                  </AppText>
                </View>
                <AppButton
                  label="Đồng bộ ngay"
                  variant="secondary"
                  loading={syncNow.isPending}
                  onPress={() => syncNow.mutate()}
                  className="h-[44px] flex-shrink px-md"
                />
              </View>
              {syncNow.isError ? (
                <AppText variant="caption" color="error">
                  {syncNow.error.message}
                </AppText>
              ) : null}
              <View className="flex-row items-center justify-between border-t border-border pt-md">
                <View className="gap-xxs">
                  <AppText variant="bodyMedium">Nguồn ưu tiên</AppText>
                  <AppText variant="caption" color="secondary">
                    Tránh cộng trùng calo từ nhiều thiết bị
                  </AppText>
                </View>
                <AppText variant="bodyMedium" color="primary">
                  Health Connect
                </AppText>
              </View>
            </AppCard>

            <InlineBanner
              tone="neutral"
              icon={<Info size={20} color={colors.info} />}
              description="Calo vận động được cộng vào ngân sách calo trong ngày trên Trang chủ."
            />

            <AppButton
              label="Ngắt kết nối"
              variant="outline"
              loading={disconnect.isPending}
              onPress={() => disconnect.mutate()}
            />
          </>
        ) : (
          <AppButton
            label="Kết nối lại"
            loading={connect.isPending}
            onPress={() => connect.mutate()}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
