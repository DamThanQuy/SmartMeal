import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowDown, ArrowUp, Equal } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { ScreenContainer } from '@/components/common';
import { AppInput, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { HealthOptionCard } from '../components/HealthOptionCard';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { GOAL_OPTIONS, type HealthGoal } from '../types/health.types';

const GOAL_ICONS: Record<HealthGoal, typeof ArrowDown> = {
  lose: ArrowDown,
  maintain: Equal,
  gain: ArrowUp,
};

const goalSchema = z
  .object({
    goal: z.enum(['lose', 'maintain', 'gain'], { message: 'Vui lòng chọn mục tiêu' }),
    goalWeightKg: z.string().min(1, { message: 'Bắt buộc' }),
  })
  .refine(
    data => Number(data.goalWeightKg) >= 30 && Number(data.goalWeightKg) <= 300,
    { message: 'Cân nặng mục tiêu không hợp lệ', path: ['goalWeightKg'] },
  );

type GoalFormValues = z.infer<typeof goalSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileGoal'>;

// design/HealthProfile.dc.html (bước 3/7, BR-024).
export function HealthProfileGoalScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goal: data.goal ?? undefined,
      goalWeightKg: data.goalWeightKg,
    },
  });

  const goal = watch('goal');

  const onSubmit = handleSubmit(values => {
    updateData({ goal: values.goal, goalWeightKg: values.goalWeightKg });
    navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_ACTIVITY);
  });

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={3} onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-xl py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Mục tiêu của bạn là gì?</AppText>
          <AppText variant="bodyLg" color="secondary">
            SmartMeal dùng thông tin này để tính lượng calo và macro phù hợp mỗi ngày.
          </AppText>
        </View>

        <View className="gap-sm">
          {GOAL_OPTIONS.map(option => {
            const Icon = GOAL_ICONS[option.id];
            const selected = goal === option.id;
            return (
              <HealthOptionCard
                key={option.id}
                title={option.title}
                description={option.description}
                selected={selected}
                icon={
                  <Icon size={22} color={selected ? colors.onPrimary : colors.primary} />
                }
                onPress={() => setValue('goal', option.id, { shouldValidate: true })}
              />
            );
          })}
          {errors.goal ? (
            <AppText variant="caption" color="error">
              {errors.goal.message}
            </AppText>
          ) : null}
        </View>

        <Controller
          control={control}
          name="goalWeightKg"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Cân nặng mục tiêu"
              placeholder="0"
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
              rightAdornment={
                <AppText variant="body" color="secondary">
                  kg
                </AppText>
              }
              error={errors.goalWeightKg?.message}
            />
          )}
        />
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter onBack={() => navigation.goBack()} onContinue={onSubmit} />
      </View>
    </ScreenContainer>
  );
}
