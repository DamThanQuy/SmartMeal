import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Droplet, Flame, TriangleAlert, Trophy } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppCard, AppSwitch, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import {
  useReminders,
  useToggleMealReminder,
  useToggleOtherReminder,
  useToggleWaterReminder,
} from '../hooks/useReminders';

type Props = NativeStackScreenProps<MainStackParamList, 'Reminders'>;

// design/Reminders.dc.html. Quyền thông báo hệ thống chưa nối expo-notifications thật (CLAUDE.md
// mục 9) — banner "Thông báo đang tắt" chỉ hiển thị theo state mock.
export function RemindersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useReminders();
  const toggleMeal = useToggleMealReminder();
  const toggleWater = useToggleWaterReminder();
  const toggleOther = useToggleOtherReminder();

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Nhắc nhở" onBack={() => navigation.goBack()} />
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Nhắc nhở" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Nhắc nhở" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-sm"
      >
        {!data.systemNotificationsEnabled ? (
          <View
            accessibilityRole="alert"
            className="flex-row items-center gap-sm rounded-card border border-warning bg-surface p-md"
          >
            <TriangleAlert size={20} color={colors.warning} />
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyMedium">Thông báo đang tắt</AppText>
              <AppText variant="caption" color="secondary">
                Bật trong cài đặt máy để nhận nhắc nhở
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở cài đặt"
              onPress={() => Linking.openSettings()}
              className="min-h-[44px] items-center justify-center"
            >
              <AppText variant="bodyMedium" color="primary">
                Mở cài đặt
              </AppText>
            </Pressable>
          </View>
        ) : null}

        <AppCard className="gap-xxs">
          <AppText variant="h3" className="mb-xxs">
            Bữa ăn
          </AppText>
          {data.meals.map(meal => (
            <View
              key={meal.mealType}
              className="flex-row items-center gap-sm border-t border-border py-xs"
            >
              <View className="flex-1 gap-xxs">
                <AppText variant="bodyLg">{MEAL_TYPE_TITLES[meal.mealType]}</AppText>
                <AppText variant="caption" color="secondary">
                  {meal.timeLabel}
                </AppText>
              </View>
              <AppSwitch
                accessibilityLabel={MEAL_TYPE_TITLES[meal.mealType]}
                checked={meal.enabled}
                onChange={() => toggleMeal.mutate(meal.mealType)}
              />
            </View>
          ))}
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3" className="mb-xxs">
            Uống nước
          </AppText>
          <View className="flex-row items-center gap-sm border-t border-border py-xs">
            <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
              <Droplet size={20} color={colors.primary} />
            </View>
            <View className="flex-1 gap-xxs">
              <AppText variant="bodyLg">Nhắc uống nước</AppText>
              <AppText variant="caption" color="secondary">
                {data.water.summaryLabel}
              </AppText>
            </View>
            <AppSwitch
              accessibilityLabel="Nhắc uống nước"
              checked={data.water.enabled}
              onChange={() => toggleWater.mutate()}
            />
          </View>
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="h3" className="mb-xxs">
            Khác
          </AppText>
          {data.other.map(item => (
            <View key={item.id} className="flex-row items-center gap-sm border-t border-border py-xs">
              <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
                {item.id === 'streak' ? (
                  <Flame size={20} color={colors.primary} />
                ) : (
                  <Trophy size={20} color={colors.primary} />
                )}
              </View>
              <View className="flex-1 gap-xxs">
                <AppText variant="bodyLg">{item.label}</AppText>
                <AppText variant="caption" color="secondary">
                  {item.description}
                </AppText>
              </View>
              <AppSwitch
                accessibilityLabel={item.label}
                checked={item.enabled}
                onChange={() => toggleOther.mutate(item.id)}
              />
            </View>
          ))}
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
}
