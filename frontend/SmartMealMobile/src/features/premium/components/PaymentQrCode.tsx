import { Image } from 'expo-image';
import { QrCode } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const QR_SIZE = 220;

export interface PaymentQrCodeProps {
  /** Ảnh mã QR do server trả; null thì hiện khung giữ chỗ. */
  uri: string | null;
  accessibilityLabel: string;
}

// Mã VietQR của đơn thanh toán (SePay, PayOS). Cạnh cố định nên đặt bằng style (CLAUDE.md mục 6).
export function PaymentQrCode({ uri, accessibilityLabel }: PaymentQrCodeProps) {
  const { colors } = useTheme();

  if (!uri) {
    return (
      <View className="items-center justify-center rounded-md bg-primary-soft" style={{ width: QR_SIZE, height: QR_SIZE }}>
        <QrCode size={64} color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface p-xs">
      <Image
        source={{ uri }}
        accessibilityLabel={accessibilityLabel}
        contentFit="contain"
        style={{ width: QR_SIZE, height: QR_SIZE }}
      />
    </View>
  );
}
