import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppIconButton } from '@/components/ui/AppIconButton';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  /** Nội dung bên phải (vd. "3/7" của Health Profile) — mặc định để trống (spacer 44px) để title luôn canh giữa. */
  rightContent?: React.ReactNode;
  className?: string;
}

// components/common — dùng chung cho mọi Screen có header dạng "back + title canh giữa"
// (Register/OTP/ForgotPassword + toàn bộ 7 bước Health Profile — cả 2 feature auth và health
// đều cần nên không đặt trong feature/components, xem .claude/rules/component-reuse.md).
export function ScreenHeader({
  title,
  onBack,
  rightContent,
  className = '',
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View className={`flex-row items-center gap-sm py-xs ${className}`}>
      {onBack ? (
        <AppIconButton
          accessibilityLabel="Quay lại"
          variant="elevated"
          shape="square"
          icon={<ChevronLeft size={22} color={colors.textPrimary} />}
          onPress={onBack}
        />
      ) : (
        <View className="h-[44px] w-[44px]" />
      )}
      <AppText variant="h3" className="flex-1 text-center">
        {title}
      </AppText>
      {rightContent ?? <View className="h-[44px] w-[44px]" />}
    </View>
  );
}
