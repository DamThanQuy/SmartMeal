import React from 'react';
import { View } from 'react-native';
import { AppButton } from '@/components/ui';

export interface HealthProfileStepFooterProps {
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
}

// "Quay lại" (outline) + "Tiếp tục" (primary) lặp lại ở cả 7 bước Health Profile
// (design/HealthProfile.dc.html, HPActivity.dc.html, HPAllergy.dc.html).
export function HealthProfileStepFooter({
  onBack,
  onContinue,
  continueLabel = 'Tiếp tục',
  continueDisabled = false,
  continueLoading = false,
}: HealthProfileStepFooterProps) {
  return (
    <View className="flex-row gap-sm">
      <AppButton
        label="Quay lại"
        variant="outline"
        onPress={onBack}
        className="flex-1"
      />
      <AppButton
        label={continueLabel}
        onPress={onContinue}
        disabled={continueDisabled}
        loading={continueLoading}
        className="flex-1"
      />
    </View>
  );
}
