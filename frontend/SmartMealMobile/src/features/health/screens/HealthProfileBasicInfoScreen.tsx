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
import { useAuthStore } from '@/state/auth/authStore';
import { HealthOptionCard } from '../components/HealthOptionCard';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { useMetaMappingCheck } from '../hooks/useMeta';
import { GENDER_OPTIONS } from '../types/health.types';

const CURRENT_YEAR = new Date().getFullYear();
// BR-020 không nêu độ tuổi tối thiểu/tối đa — 13–100 là giới hạn an toàn hợp lý cho app sức
// khỏe, CẦN xác nhận nếu business có quy định khác.
const MIN_AGE = 13;
const MAX_AGE = 100;

const basicInfoSchema = z
  .object({
    day: z.string().min(1, { message: 'Bắt buộc' }),
    month: z.string().min(1, { message: 'Bắt buộc' }),
    year: z.string().min(4, { message: 'Bắt buộc' }),
    gender: z.enum(['male', 'female', 'other'], {
      message: 'Vui lòng chọn giới tính',
    }),
  })
  .refine(
    data => {
      const day = Number(data.day);
      const month = Number(data.month);
      const year = Number(data.year);
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    { message: 'Ngày sinh không hợp lệ', path: ['day'] },
  )
  .refine(
    data => {
      const age = CURRENT_YEAR - Number(data.year);
      return age >= MIN_AGE && age <= MAX_AGE;
    },
    { message: `Tuổi phải từ ${MIN_AGE} đến ${MAX_AGE}`, path: ['year'] },
  );

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileBasicInfo'>;

// design.md mục 31 bước 1/7 "Thông tin cơ bản" — chưa có artboard riêng (chỉ HealthProfile/
// HPActivity/HPAllergy được mock ở bước 3/4/5), dựng theo đúng ngôn ngữ hình ảnh của 3 màn đó.
export function HealthProfileBasicInfoScreen({ navigation }: Props) {
  // Wizard sắp gửi id dị ứng/bệnh lý lên BE — đối chiếu sớm với /meta/* (chỉ cảnh báo ở dev).
  useMetaMappingCheck();
  const logout = useAuthStore(state => state.logout);
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      day: data.dateOfBirth.day,
      month: data.dateOfBirth.month,
      year: data.dateOfBirth.year,
      gender: data.gender ?? undefined,
    },
  });

  const gender = watch('gender');

  // Bước đầu của wizard: không còn màn nào phía sau để quay lại khi tài khoản đã tạo (đăng ký bằng
  // API thật hoặc mở lại app giữa chừng) → "Quay lại" nghĩa là thoát onboarding: đăng xuất rồi về
  // Welcome (AuthNavigator vẫn đang mount nên phải reset stack thủ công).
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    logout();
    navigation.reset({ index: 0, routes: [{ name: AUTH_ROUTES.WELCOME }] });
  };

  const onSubmit = handleSubmit(values => {
    updateData({
      dateOfBirth: { day: values.day, month: values.month, year: values.year },
      gender: values.gender,
    });
    navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_BODY);
  });

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={1} onBack={handleBack} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-xl py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Thông tin cơ bản</AppText>
          <AppText variant="bodyLg" color="secondary">
            SmartMeal dùng thông tin này để tính chỉ số sức khỏe của bạn.
          </AppText>
        </View>

        <View className="gap-xs">
          <AppText variant="bodyMedium" color="secondary">
            Ngày sinh
          </AppText>
          <View className="flex-row gap-sm">
            <Controller
              control={control}
              name="day"
              render={({ field: { value, onChange } }) => (
                <AppInput
                  placeholder="DD"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={value}
                  onChangeText={onChange}
                  className="text-center"
                />
              )}
            />
            <Controller
              control={control}
              name="month"
              render={({ field: { value, onChange } }) => (
                <AppInput
                  placeholder="MM"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={value}
                  onChangeText={onChange}
                  className="text-center"
                />
              )}
            />
            <Controller
              control={control}
              name="year"
              render={({ field: { value, onChange } }) => (
                <AppInput
                  placeholder="YYYY"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={value}
                  onChangeText={onChange}
                  className="text-center"
                />
              )}
            />
          </View>
          {errors.day || errors.month || errors.year ? (
            <AppText variant="caption" color="error">
              {errors.day?.message ?? errors.month?.message ?? errors.year?.message}
            </AppText>
          ) : null}
        </View>

        <View className="gap-sm">
          <AppText variant="bodyMedium" color="secondary">
            Giới tính
          </AppText>
          <View className="gap-sm">
            {GENDER_OPTIONS.map(option => (
              <HealthOptionCard
                key={option.id}
                title={option.label}
                selected={gender === option.id}
                onPress={() => setValue('gender', option.id, { shouldValidate: true })}
              />
            ))}
          </View>
          {errors.gender ? (
            <AppText variant="caption" color="error">
              {errors.gender.message}
            </AppText>
          ) : null}
        </View>
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter onBack={handleBack} onContinue={onSubmit} />
      </View>
    </ScreenContainer>
  );
}
