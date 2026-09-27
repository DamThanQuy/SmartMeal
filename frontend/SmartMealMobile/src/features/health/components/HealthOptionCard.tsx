import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface HealthOptionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}

// features/health/components — card chọn 1 lựa chọn dạng radio, dùng lại cho Giới tính
// (bước 1), Mục tiêu (design/HealthProfile.dc.html — bước 3) và Vận động
// (design/HPActivity.dc.html — bước 4). Build từ AppText/Pressable, không có business logic
// nên nếu cần dùng ở feature khác có thể nâng cấp lên components/ui sau.
export function HealthOptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: HealthOptionCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[64px] flex-row items-center gap-md rounded-card border p-md ${
        selected ? 'border-2 border-primary bg-primary-soft' : 'border-border bg-surface'
      }`}
    >
      {icon ? (
        <View
          className={`h-[44px] w-[44px] items-center justify-center rounded-md ${
            selected ? 'bg-primary' : 'bg-primary-soft'
          }`}
        >
          {icon}
        </View>
      ) : null}
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyMedium">{title}</AppText>
        {description ? (
          <AppText variant="caption" color="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {selected ? (
        <View className="h-[24px] w-[24px] items-center justify-center rounded-pill bg-primary">
          <Check size={16} color={colors.onPrimary} strokeWidth={3} />
        </View>
      ) : (
        <View className="h-[22px] w-[22px] rounded-pill border-2 border-border" />
      )}
    </Pressable>
  );
}
