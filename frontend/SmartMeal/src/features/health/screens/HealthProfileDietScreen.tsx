import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppButton, AppChip, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { useSubmitHealthProfile } from '../hooks/useSubmitHealthProfile';
import { DIETARY_PREFERENCE_OPTIONS } from '../types/health.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileDiet'>;

// design.md mục 31 bước 7/7 "Chế độ ăn" — chưa có artboard riêng, dựng theo mẫu chip.
// BR-100. Đây là bước cuối nên "Tiếp tục" gọi luôn mock submit (BR-020→BR-024, BR-030).
export function HealthProfileDietScreen({ navigation }: Props) {
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const setResult = useHealthProfileForm(state => state.setResult);
  const [preferenceIds, setPreferenceIds] = useState<string[]>(
    data.dietaryPreferenceIds,
  );
  const [noPreference, setNoPreference] = useState(data.noDietaryPreference);
  const submitHealthProfile = useSubmitHealthProfile();

  const togglePreference = (id: string) => {
    setNoPreference(false);
    setPreferenceIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const handleToggleNoPreference = () => {
    setNoPreference(current => {
      const next = !current;
      if (next) setPreferenceIds([]);
      return next;
    });
  };

  const onSubmit = () => {
    const finalData = {
      ...data,
      dietaryPreferenceIds: preferenceIds,
      noDietaryPreference: noPreference,
    };
    updateData({ dietaryPreferenceIds: preferenceIds, noDietaryPreference: noPreference });
    submitHealthProfile.mutate(finalData, {
      onSuccess: result => {
        setResult(result);
        navigation.navigate(AUTH_ROUTES.HEALTH_RESULT);
      },
    });
  };

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={7} onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Bạn theo chế độ ăn nào?</AppText>
          <AppText variant="bodyLg" color="secondary">
            SmartMeal sẽ ưu tiên gợi ý công thức phù hợp chế độ ăn của bạn.
          </AppText>
        </View>

        <View className="flex-row flex-wrap gap-sm">
          {DIETARY_PREFERENCE_OPTIONS.map(option => (
            <AppChip
              key={option.id}
              label={option.label}
              selected={preferenceIds.includes(option.id)}
              onPress={() => togglePreference(option.id)}
            />
          ))}
        </View>

        <AppButton
          label="Không theo chế độ đặc biệt"
          variant={noPreference ? 'secondary' : 'outline'}
          onPress={handleToggleNoPreference}
        />

        {submitHealthProfile.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {submitHealthProfile.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter
          onBack={() => navigation.goBack()}
          onContinue={onSubmit}
          continueLabel="Xem kết quả"
          continueLoading={submitHealthProfile.isPending}
        />
      </View>
    </ScreenContainer>
  );
}
