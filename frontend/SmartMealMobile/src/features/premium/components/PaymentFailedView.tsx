import { X } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { ScreenContainer } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface PaymentFailedViewProps {
  message: string;
  onRetry: () => void;
  onChangeMethod: () => void;
}

// Tạo giao dịch/chờ xác nhận thất bại (PaymentPending, BankTransfer): báo lý do, thử lại hoặc đổi phương thức.
export function PaymentFailedView({ message, onRetry, onChangeMethod }: PaymentFailedViewProps) {
  const { colors } = useTheme();

  return (
    <ScreenContainer contentContainerClassName="gap-lg" scroll>
      <View className="flex-1 items-center justify-center gap-sm py-xl">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-surface">
          <X size={32} color={colors.error} />
        </View>
        <AppText variant="h2" className="text-center">
          Thanh toán thất bại
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          {message}
        </AppText>
      </View>
      <View className="gap-sm">
        <AppButton label="Thử lại" onPress={onRetry} />
        <AppButton label="Đổi phương thức" variant="outline" onPress={onChangeMethod} />
      </View>
    </ScreenContainer>
  );
}
