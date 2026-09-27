import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

export type InlineBannerTone = 'neutral' | 'success-outline' | 'success-soft';

export interface InlineBannerProps {
  icon: React.ReactNode;
  title?: string;
  description: string;
  tone?: InlineBannerTone;
  className?: string;
}

const TONE_CLASSNAME: Record<InlineBannerTone, string> = {
  neutral: 'bg-surface border border-border',
  'success-outline': 'bg-surface border border-primary',
  'success-soft': 'bg-primary-soft',
};

// components/common — banner icon+text lặp lại ở nhiều màn của cả 2 feature auth và health
// (OTP/ForgotPassword, HPAllergy/HealthResult...), không business logic nên đặt ở đây thay vì
// feature/components (xem .claude/rules/component-reuse.md).
export function InlineBanner({
  icon,
  title,
  description,
  tone = 'neutral',
  className = '',
}: InlineBannerProps) {
  return (
    <View
      className={`flex-row items-start gap-sm rounded-md p-md ${TONE_CLASSNAME[tone]} ${className}`}
    >
      <View className="pt-xxs">{icon}</View>
      <View className="flex-1 gap-xxs">
        {title ? (
          <AppText variant="bodyMedium">{title}</AppText>
        ) : null}
        <AppText variant="caption" color="secondary">
          {description}
        </AppText>
      </View>
    </View>
  );
}
