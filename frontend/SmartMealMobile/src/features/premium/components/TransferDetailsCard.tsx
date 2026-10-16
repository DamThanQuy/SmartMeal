import { Check } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppCard, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { BankTransferInfo } from '../types/premium.types';
import { TransferInfoRow } from './TransferInfoRow';

export interface TransferDetailsCardProps {
  transfer: BankTransferInfo;
  amountVnd: number;
  /** Chép giá trị (vd. từ useCopyFeedback) — nhãn dùng cho dòng "Đã sao chép …". */
  onCopy: (label: string, value: string) => void;
  copiedLabel: string | null;
}

// Thông tin chuyển khoản kèm nút sao chép từng dòng — trang chuyển khoản STK và mục dự phòng ở trang mở app ngân hàng.
export function TransferDetailsCard({ transfer, amountVnd, onCopy, copiedLabel }: TransferDetailsCardProps) {
  const { colors } = useTheme();

  return (
    <AppCard className="gap-xxs">
      <AppText variant="bodyMedium" className="pb-xxs">
        Thông tin chuyển khoản
      </AppText>
      <TransferInfoRow label="Ngân hàng" value={transfer.bankCode} />
      <TransferInfoRow
        label="Số tài khoản"
        value={transfer.accountNumber}
        selectable
        onCopy={() => onCopy('số tài khoản', transfer.accountNumber)}
      />
      {transfer.accountName ? <TransferInfoRow label="Chủ tài khoản" value={transfer.accountName} /> : null}
      <TransferInfoRow
        label="Số tiền"
        value={`${amountVnd.toLocaleString('vi-VN')}đ`}
        onCopy={() => onCopy('số tiền', String(amountVnd))}
      />
      <TransferInfoRow
        label="Nội dung"
        value={transfer.transferContent}
        selectable
        emphasize
        onCopy={() => onCopy('nội dung chuyển khoản', transfer.transferContent)}
      />
      {copiedLabel ? (
        <View accessibilityLiveRegion="polite" className="flex-row items-center gap-xxs pt-xxs">
          <Check size={14} color={colors.primary} />
          <AppText variant="caption" color="onPrimarySoft">{`Đã sao chép ${copiedLabel}`}</AppText>
        </View>
      ) : null}
    </AppCard>
  );
}
