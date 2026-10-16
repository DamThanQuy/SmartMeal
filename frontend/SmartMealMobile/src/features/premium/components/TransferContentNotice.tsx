import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { InlineBanner } from '@/components/common';
import { useTheme } from '@/theme/ThemeProvider';
import type { BankTransferInfo } from '../types/premium.types';

export interface TransferContentNoticeProps {
  transfer: BankTransferInfo;
  amountVnd: number;
}

// Server khớp tiền vào với đơn theo nội dung chuyển khoản — nhắc ghi đúng nội dung (và hạn dùng) ở mọi màn chuyển khoản.
export function TransferContentNotice({ transfer, amountVnd }: TransferContentNoticeProps) {
  const { colors } = useTheme();
  const expiresAt = transfer.expiresAtIso ? format(new Date(transfer.expiresAtIso), 'HH:mm') : null;

  return (
    <InlineBanner
      icon={<AlertTriangle size={20} color={colors.warning} />}
      title="Ghi đúng nội dung chuyển khoản"
      description={`Chuyển đúng ${amountVnd.toLocaleString('vi-VN')}đ với nội dung ${transfer.transferContent} để hệ thống tự nhận ra giao dịch.${
        expiresAt ? ` Dùng được đến ${expiresAt}.` : ''
      }`}
    />
  );
}
