import { UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppButton, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface EmptyMealDashedCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

// design/Dashboard.dc.html "Chưa có bữa tối" — card viền nét đứt, khác EmptyState chuẩn
// (components/common) vì đây chỉ là 1 hàng trong danh sách "Bữa ăn hôm nay", không chiếm
// toàn màn hình.
export function EmptyMealDashedCard({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyMealDashedCardProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-sm rounded-card border border-dashed border-border bg-surface p-md">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-md bg-primary-soft">
        <UtensilsCrossed size={26} color={colors.primary} />
      </View>
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" color="secondary">
          {description}
        </AppText>
      </View>
      <AppButton
        label={actionLabel}
        variant="secondary"
        onPress={onAction}
        className="h-[44px] flex-shrink px-md"
      />
    </View>
  );
}
