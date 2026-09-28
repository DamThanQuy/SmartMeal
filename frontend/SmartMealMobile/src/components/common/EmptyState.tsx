import React from 'react';
import { View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Hành động phụ tùy chọn, vd. "Thêm nguyên liệu thủ công" — design/GroceryEmpty.dc.html,
   * cùng cách mở rộng với ErrorState (.claude/rules/component-reuse.md). */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

// docs/design.md mục 20 (Empty State), mục 51 — mọi màn hình có dữ liệu bất đồng bộ phải
// xử lý trạng thái rỗng thay vì để trắng.
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center gap-sm p-xl ${className}`}
    >
      {icon}
      <AppText variant="h3" className="text-center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" color="secondary" className="text-center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
          className="mt-sm"
        />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <AppButton label={secondaryActionLabel} variant="outline" onPress={onSecondaryAction} />
      ) : null}
    </View>
  );
}
