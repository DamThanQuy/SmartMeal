import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/theme/ThemeProvider';

export interface SuccessToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

// design/SaveSuccess.dc.html — toast xác nhận sau khi lưu/sửa/xóa nhật ký (BR-052, BR-053).
// Đặt trong components/common vì dùng lại ở nhiều màn của feature nutrition (Diary sau khi
// EditMealLog/FoodSearch/DeleteConfirm quay về) — không có business logic riêng.
export function SuccessToast({
  message,
  actionLabel,
  onAction,
  className = '',
}: SuccessToastProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`absolute inset-x-md bottom-md flex-row items-center gap-sm rounded-lg bg-text-primary p-md ${className}`}
      style={shadows.elevated}
    >
      <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-primary">
        <Check size={16} color={colors.onPrimary} strokeWidth={3} />
      </View>
      <AppText variant="body" className="flex-1 text-text-inverse">
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          className="min-h-[44px] items-center justify-center"
        >
          <AppText variant="bodyMedium" className="text-primary-soft">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
