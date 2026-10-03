import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Clock, Info } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ErrorState, InlineBanner, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppCard, AppSwitch, AppText } from '@/components/ui';
import {
  calculateCalorieBudget,
  todayIso,
  useDiaryDay,
  useHealthSyncDaily,
  useSetIncludeActivityCalories,
} from '@/features/nutrition';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'CalorieBudget'>;

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

// design/CalorieBudget.dc.html (BR-040→042). Đích mới cho thẻ calo ở Dashboard. Ngân sách =
// Mục tiêu + Calo vận động hợp lệ, tính bằng ĐÚNG 1 hàm dùng chung với Dashboard/Diary/
// ProgressChart (calculateCalorieBudget, features/nutrition) — không tự cộng lại ở đây.
export function CalorieBudgetScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const dateIso = todayIso();
  const { data: diary, isLoading, isError, error, refetch } = useDiaryDay(dateIso);
  // Calo vận động từ health-sync. Lỗi/chưa có → 0; chỉ chờ khi đang tải để số không nhảy từ 0.
  const { data: activity, isLoading: isActivityLoading } = useHealthSyncDaily(dateIso);
  const includeActivityCalories = useUserProfileStore(state => state.includeActivityCalories);
  const setIncludeActivityCalories = useSetIncludeActivityCalories();

  if (isLoading || isActivityLoading || !diary) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Ngân sách calo" onBack={() => navigation.goBack()} />
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Ngân sách calo" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const budget = calculateCalorieBudget({
    calorieTarget: diary.calorieTarget,
    activityCaloriesBurned: activity?.caloriesBurned ?? 0,
    includeActivityCalories,
  });
  // Backend chỉ có tên nguồn và tổng calo; chi tiết từng nguồn/hoạt động chỉ có ở bản mock nên
  // các khối này tự ẩn khi không có dữ liệu.
  const sourceDetails = activity?.sourceDetails ?? [];
  const activities = activity?.activities ?? [];
  const consumed = Object.values(diary.entriesByMeal)
    .flat()
    .reduce((sum, entry) => sum + entry.nutrition.calories, 0);
  const remaining = Math.max(budget.budget - consumed, 0);
  const progressPercent = budget.budget > 0 ? Math.min(consumed / budget.budget, 1) : 0;

  return (
    <ScreenContainer>
      <ScreenHeader title="Ngân sách calo" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-xs"
      >
        <AppCard className="gap-md">
          <AppText variant="h3">Ngân sách hôm nay</AppText>
          <View className="flex-row items-start">
            <View className="flex-1 items-center gap-xxs">
              <AppText variant="caption" color="secondary">
                Mục tiêu
              </AppText>
              <AppText variant="h2">{formatNumber(budget.calorieTarget)}</AppText>
              <AppText variant="caption" color="secondary">
                kcal
              </AppText>
            </View>
            <AppText variant="h3" color="secondary" className="pt-md">
              +
            </AppText>
            <View className="flex-1 items-center gap-xxs">
              <AppText variant="caption" color="secondary">
                Vận động
              </AppText>
              <AppText variant="h2" color="onPrimarySoft">
                {formatNumber(budget.activityCalories)}
              </AppText>
              <AppText variant="caption" color="secondary">
                kcal
              </AppText>
            </View>
            <AppText variant="h3" color="secondary" className="pt-md">
              =
            </AppText>
            <View className="flex-1 items-center gap-xxs">
              <AppText variant="caption" color="secondary">
                Ngân sách
              </AppText>
              <AppText variant="h2" color="onPrimarySoft">
                {formatNumber(budget.budget)}
              </AppText>
              <AppText variant="caption" color="secondary">
                kcal
              </AppText>
            </View>
          </View>
        </AppCard>

        <AppCard className="gap-sm">
          <View className="flex-row items-baseline justify-between">
            <AppText variant="body" color="secondary">
              Đã nạp
            </AppText>
            <AppText variant="body" color="secondary">
              <AppText variant="h3">{formatNumber(consumed)}</AppText>
              {` / ${formatNumber(budget.budget)} kcal`}
            </AppText>
          </View>
          <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
            <View className="h-[8px] rounded-pill bg-primary" style={{ width: `${progressPercent * 100}%` }} />
          </View>
          <View className="flex-row justify-between">
            <AppText variant="body" color="secondary">
              Còn lại
            </AppText>
            <AppText variant="bodyMedium" color="onPrimarySoft">{`${formatNumber(remaining)} kcal`}</AppText>
          </View>
        </AppCard>

        {sourceDetails.length > 0 ? (
          <AppCard className="gap-xxs">
            <AppText variant="h3" className="pb-xxs">
              Nguồn vận động
            </AppText>
            {sourceDetails.map(source => (
              <View key={source.id} className="flex-row items-center gap-sm border-t border-border py-sm">
                <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
                  <CheckCircle2 size={20} color={colors.primary} />
                </View>
                <View className="flex-1 gap-xxs">
                  <AppText variant="bodyMedium">{source.label}</AppText>
                  <AppText variant="caption" color="secondary">
                    {source.note}
                  </AppText>
                </View>
                <View className="items-end gap-xxs">
                  {source.calories !== undefined ? (
                    <AppText variant="bodyMedium">{`${source.calories} kcal`}</AppText>
                  ) : null}
                  <AppBadge
                    label={source.countsTowardBudget ? 'Đã cộng' : 'Bỏ qua trùng'}
                    tone={source.countsTowardBudget ? 'primary' : 'warning'}
                    icon={<CheckCircle2 size={12} color={colors.onPrimarySoft} />}
                  />
                </View>
              </View>
            ))}
          </AppCard>
        ) : null}

        {activities.length > 0 ? (
          <AppCard className="gap-xxs">
            <AppText variant="h3" className="pb-xxs">
              Hoạt động được tính
            </AppText>
            {activities.map(item => (
              <View
                key={item.label}
                className="flex-row items-center justify-between border-t border-border py-sm"
              >
                <View className="gap-xxs">
                  <AppText variant="bodyMedium">{item.label}</AppText>
                  <View className="flex-row items-center gap-xxs">
                    <Clock size={12} color={colors.textSecondary} />
                    <AppText variant="caption" color="secondary">
                      {item.windowLabel}
                    </AppText>
                  </View>
                </View>
                <AppText variant="body">{`≈ ${item.calories} kcal`}</AppText>
              </View>
            ))}
          </AppCard>
        ) : null}

        <AppCard className="flex-row items-center gap-sm">
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium">Cộng calo vận động vào ngân sách</AppText>
            <AppText variant="caption" color="secondary">
              {`Tắt để chỉ dùng mục tiêu cơ bản ${formatNumber(budget.calorieTarget)} kcal`}
            </AppText>
          </View>
          <AppSwitch
            accessibilityLabel="Cộng calo vận động"
            checked={includeActivityCalories}
            onChange={setIncludeActivityCalories}
          />
        </AppCard>

        <InlineBanner
          icon={<Info size={20} color={colors.info} />}
          description="Mỗi hoạt động chỉ được cộng một lần, kể cả khi nhiều thiết bị cùng ghi nhận."
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quản lý kết nối Health Connect"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.HEALTH_CONNECT)}
          className="min-h-[44px] items-center justify-center pb-md"
        >
          <AppText variant="bodyMedium" color="onPrimarySoft">
            Quản lý kết nối Health Connect
          </AppText>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
