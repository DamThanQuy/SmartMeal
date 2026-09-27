import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Info, Target } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { GOAL_OPTIONS } from '../types/health.types';

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthResult'>;

// design/HealthResult.dc.html (BR-024, BR-030, BR-112). Hoàn tất đăng ký tại đây: bấm "Bắt
// đầu với SmartMeal" mới thật sự login() vào MainNavigator (trước đó vẫn ở AuthNavigator để
// không bỏ dở Health Profile — xem src/state/auth/authStore.ts).
export function HealthResultScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const result = useHealthProfileForm(state => state.result);
  const resetForm = useHealthProfileForm(state => state.reset);
  const pendingUser = useAuthStore(state => state.pendingUser);
  const login = useAuthStore(state => state.login);

  const goBackToGoalStep = () => navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_GOAL);

  if (!result) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Kế hoạch của bạn" onBack={goBackToGoalStep} />
        <EmptyState
          title="Chưa có kết quả"
          description="Vui lòng hoàn tất các bước Hồ sơ sức khỏe trước."
          actionLabel="Quay lại"
          onAction={goBackToGoalStep}
        />
      </ScreenContainer>
    );
  }

  const goalLabel =
    GOAL_OPTIONS.find(option => option.id === result.goal)?.title ?? '';

  const handleStart = () => {
    login({
      id: 'mock-user-1',
      fullName: pendingUser?.fullName ?? 'Người dùng SmartMeal',
      email: pendingUser?.email ?? 'user@smartmeal.dev',
    });
    resetForm();
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Kế hoạch của bạn" onBack={goBackToGoalStep} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-xl py-md"
      >
        <View className="items-center gap-xs">
          <View className="h-[56px] w-[56px] items-center justify-center rounded-pill bg-primary-soft">
            <Target size={28} color={colors.primary} />
          </View>
          <AppText variant="h1">Mục tiêu mỗi ngày</AppText>
          <AppText variant="caption" color="secondary">
            {`Tính từ hồ sơ sức khỏe của bạn · Mục tiêu: ${goalLabel}`}
          </AppText>
        </View>

        <AppCard className="gap-md">
          <View className="flex-row items-baseline justify-center gap-xs">
            <AppText variant="display" color="success">
              {formatNumber(result.calorieTarget)}
            </AppText>
            <AppText variant="body" color="secondary">
              kcal / ngày
            </AppText>
          </View>

          <MacroProgressRow label="Protein" valueG={result.macros.proteinG} />
          <MacroProgressRow label="Carbs" valueG={result.macros.carbsG} />
          <MacroProgressRow label="Fat" valueG={result.macros.fatG} />
        </AppCard>

        <View className="gap-sm">
          <AppText variant="h3">Chỉ số cơ thể</AppText>
          <View className="flex-row gap-sm">
            <BodyMetricTile label="BMI" value={result.bmi.toLocaleString('vi-VN')} />
            <BodyMetricTile label="BMR" value={formatNumber(result.bmr)} unit="kcal" />
            <BodyMetricTile label="TDEE" value={formatNumber(result.tdee)} unit="kcal" />
          </View>
        </View>

        <InlineBanner
          tone="neutral"
          icon={<Info size={20} color={colors.info} />}
          description="Các chỉ số chỉ mang tính tham khảo, không thay thế chẩn đoán hay tư vấn của bác sĩ."
        />
      </ScrollView>

      <View className="gap-xs py-md">
        <AppButton label="Bắt đầu với SmartMeal" onPress={handleStart} />
        <AppButton
          label="Điều chỉnh mục tiêu"
          variant="text"
          onPress={goBackToGoalStep}
        />
      </View>
    </ScreenContainer>
  );
}

interface MacroProgressRowProps {
  label: string;
  valueG: number;
}

function MacroProgressRow({ label, valueG }: MacroProgressRowProps) {
  return (
    <View className="gap-xxs">
      <View className="flex-row justify-between">
        <AppText variant="caption" color="secondary">
          {label}
        </AppText>
        <AppText variant="bodyMedium">{`${valueG} g`}</AppText>
      </View>
      <View className="h-[6px] overflow-hidden rounded-pill bg-primary-soft">
        <View className="h-[6px] w-full rounded-pill bg-primary" />
      </View>
    </View>
  );
}

interface BodyMetricTileProps {
  label: string;
  value: string;
  unit?: string;
}

function BodyMetricTile({ label, value, unit }: BodyMetricTileProps) {
  return (
    <View className="flex-1 gap-xxs rounded-md bg-background p-sm">
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="bodyMedium">
        {value}
        {unit ? (
          <AppText variant="caption" color="secondary">{` ${unit}`}</AppText>
        ) : null}
      </AppText>
    </View>
  );
}
