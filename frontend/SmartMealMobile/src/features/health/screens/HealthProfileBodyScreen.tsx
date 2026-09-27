import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { ScreenContainer } from '@/components/common';
import { AppInput, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';

// Giới hạn hợp lý cho người trưởng thành — CẦN xác nhận nếu business có ngưỡng khác.
const bodySchema = z
  .object({
    heightCm: z.string().min(1, { message: 'Bắt buộc' }),
    weightKg: z.string().min(1, { message: 'Bắt buộc' }),
  })
  .refine(data => Number(data.heightCm) >= 100 && Number(data.heightCm) <= 250, {
    message: 'Chiều cao không hợp lệ',
    path: ['heightCm'],
  })
  .refine(data => Number(data.weightKg) >= 30 && Number(data.weightKg) <= 300, {
    message: 'Cân nặng không hợp lệ',
    path: ['weightKg'],
  });

type BodyFormValues = z.infer<typeof bodySchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileBody'>;

// design.md mục 31 bước 2/7 "Cơ thể" — chưa có artboard riêng, dựng theo mẫu input đơn vị
// (kg) đã thấy ở design/HealthProfile.dc.html (ô "Cân nặng mục tiêu").
export function HealthProfileBodyScreen({ navigation }: Props) {
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BodyFormValues>({
    resolver: zodResolver(bodySchema),
    defaultValues: {
      heightCm: data.heightCm,
      weightKg: data.weightKg,
    },
  });

  const onSubmit = handleSubmit(values => {
    updateData({ heightCm: values.heightCm, weightKg: values.weightKg });
    navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_GOAL);
  });

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={2} onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-xl py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Cơ thể của bạn</AppText>
          <AppText variant="bodyLg" color="secondary">
            Dùng để tính BMI, BMR và nhu cầu calo hàng ngày.
          </AppText>
        </View>

        <View className="gap-md">
          <Controller
            control={control}
            name="heightCm"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Chiều cao"
                placeholder="0"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    cm
                  </AppText>
                }
                error={errors.heightCm?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="weightKg"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Cân nặng hiện tại"
                placeholder="0"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    kg
                  </AppText>
                }
                error={errors.weightKg?.message}
              />
            )}
          />
        </View>
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter onBack={() => navigation.goBack()} onContinue={onSubmit} />
      </View>
    </ScreenContainer>
  );
}
