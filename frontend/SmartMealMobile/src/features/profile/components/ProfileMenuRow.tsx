import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, type AppTextColor } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface ProfileMenuRowProps {
  icon: React.ReactNode;
  label: string;
  valueLabel?: string;
  onPress: () => void;
  tone?: AppTextColor;
}

// design/Profile.dc.html — hàng menu icon+label+value+chevron, lặp lại 6 lần trong "Chi tiết
// sức khỏe" nên tách component feature-local (chỉ Profile dùng, chưa cần đẩy lên components/common).
export function ProfileMenuRow({ icon, label, valueLabel, onPress, tone = 'primary' }: ProfileMenuRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-[48px] flex-row items-center gap-sm border-t border-border py-xs"
    >
      <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
        {icon}
      </View>
      <AppText variant="bodyLg" color={tone} className="flex-1">
        {label}
      </AppText>
      {valueLabel ? (
        <AppText variant="body" color="secondary">
          {valueLabel}
        </AppText>
      ) : null}
      <ChevronRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}
