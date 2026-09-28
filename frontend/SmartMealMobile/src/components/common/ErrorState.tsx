import React from 'react';
import { View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
  /** Hành động phụ tùy chọn, vd. "Xem công thức đã lưu" — design/StateError.dc.html. */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

// docs/design.md mục 52 (Error States) — nói rõ vấn đề, không technical jargon, có action nếu có thể.
export function ErrorState({
  title = 'Có lỗi xảy ra',
  description,
  actionLabel = 'Thử lại',
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: ErrorStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center gap-sm p-xl ${className}`}
      accessibilityRole="alert"
    >
      <AppText variant="h3" color="error" className="text-center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" color="secondary" className="text-center">
          {description}
        </AppText>
      ) : null}
      {onRetry ? (
        <AppButton
          label={actionLabel}
          variant="primary"
          onPress={onRetry}
          className="mt-sm"
        />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <AppButton
          label={secondaryActionLabel}
          variant="outline"
          onPress={onSecondaryAction}
        />
      ) : null}
    </View>
  );
}
