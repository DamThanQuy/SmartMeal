import { Copy } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface TransferInfoRowProps {
  label: string;
  value: string;
  /** Nhấn giữ để chọn chữ (số tài khoản, nội dung chuyển khoản). */
  selectable?: boolean;
  emphasize?: boolean;
  /** Có thì hiện nút sao chép bên phải giá trị. */
  onCopy?: () => void;
}

// Một dòng thông tin chuyển khoản (nhãn trái, giá trị phải) — dùng ở màn quét QR SePay và trang chuyển khoản STK.
export function TransferInfoRow({ label, value, selectable = false, emphasize = false, onCopy }: TransferInfoRowProps) {
  const { colors } = useTheme();

  return (
    <View className={`w-full flex-row items-center justify-between gap-sm ${onCopy ? 'min-h-[44px]' : ''}`}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <View className="flex-shrink flex-row items-center gap-xs">
        <AppText
          variant={emphasize ? 'h3' : 'bodyMedium'}
          color={emphasize ? 'onPrimarySoft' : 'primary'}
          selectable={selectable}
          className="flex-shrink text-right"
        >
          {value}
        </AppText>
        {onCopy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sao chép ${label.toLowerCase()}`}
            hitSlop={8}
            onPress={onCopy}
            className="h-[36px] w-[36px] items-center justify-center rounded-md bg-primary-soft active:opacity-70"
          >
            <Copy size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
