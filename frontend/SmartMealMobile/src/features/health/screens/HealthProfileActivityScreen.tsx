import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { HealthOptionCard } from '../components/HealthOptionCard';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { ACTIVITY_OPTIONS, type ActivityLevel } from '../types/health.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileActivity'>;

// design/HPActivity.dc.html (bước 4/7, BR-023).
export function HealthProfileActivityScreen({ navigation }: Props) {
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    data.activityLevel,
  );

  const onSubmit = () => {
    if (!activityLevel) return;
    updateData({ activityLevel });
    navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_ALLERGY);
  };

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={4} onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-xl py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Mức độ vận động</AppText>
          <AppText variant="bodyLg" color="secondary">
            Dùng để tính TDEE (năng lượng tiêu hao mỗi ngày).
          </AppText>
        </View>

        <View className="gap-sm">
          {ACTIVITY_OPTIONS.map(option => (
            <HealthOptionCard
              key={option.id}
              title={option.title}
              description={option.description}
              selected={activityLevel === option.id}
              onPress={() => setActivityLevel(option.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter
          onBack={() => navigation.goBack()}
          onContinue={onSubmit}
          continueDisabled={!activityLevel}
        />
      </View>
    </ScreenContainer>
  );
}
