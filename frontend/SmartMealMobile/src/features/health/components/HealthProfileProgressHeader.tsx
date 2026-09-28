import React from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';

export const HEALTH_PROFILE_TOTAL_STEPS = 7;

export interface HealthProfileProgressHeaderProps {
  step: number;
  onBack: () => void;
}

// design/HealthProfile.dc.html, HPActivity.dc.html, HPAllergy.dc.html — header dùng chung
// cho cả 7 bước Health Profile (ScreenHeader + số bước "n/7" + progress bar 7 đoạn).
export function HealthProfileProgressHeader({
  step,
  onBack,
}: HealthProfileProgressHeaderProps) {
  return (
    <View className="gap-md">
      <ScreenHeader
        title="Hồ sơ sức khỏe"
        onBack={onBack}
        rightContent={
          <View className="w-[44px] items-end">
            <AppText variant="body" color="secondary">{`${step}/${HEALTH_PROFILE_TOTAL_STEPS}`}</AppText>
          </View>
        }
      />
      <View
        className="flex-row gap-xxs"
        accessibilityLabel={`Bước ${step} trên ${HEALTH_PROFILE_TOTAL_STEPS}`}
      >
        {Array.from({ length: HEALTH_PROFILE_TOTAL_STEPS }).map((_, index) => (
          <View
            key={index}
            className={`h-[6px] flex-1 rounded-pill ${
              index < step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </View>
    </View>
  );
}
