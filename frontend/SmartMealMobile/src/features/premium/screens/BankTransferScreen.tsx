import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { AlertTriangle, Check } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { InlineBanner, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { PaymentFailedView } from '../components/PaymentFailedView';
import { TransferInfoRow } from '../components/TransferInfoRow';
import { usePaymentSession } from '../hooks/usePaymentSession';
import { copyToClipboard } from '../services/clipboard';
import { BILLING_PLAN_OPTIONS } from '../types/premium.types';

type Props = NativeStackScreenProps<MainStackParamList, 'BankTransfer'>;

/** Thời gian hiện dòng "Đã sao chép …". */
const COPIED_FEEDBACK_MS = 2000;

const TRANSFER_STEPS = [
  'Sao chép số tài khoản, số tiền và nội dung ở trên.',
  'Mở app ngân hàng của bạn, chuyển khoản đúng số tiền và nội dung.',
  'Quay lại SmartMeal — Pro tự kích hoạt ngay khi tiền vào tài khoản.',
];

// Phương thức "Chuyển khoản qua số tài khoản" (BR-241/242): không quét QR — tạo đơn BANK_TRANSFER khi vào màn, hiện số
// tài khoản / số tiền / nội dung kèm nút sao chép để người dùng tự chuyển trong app ngân hàng. Tiền vào cùng tài khoản
// SePay nên server tự xác nhận theo nội dung; quay lại app hoặc bấm "Tôi đã chuyển khoản" thì hỏi trạng thái ngay
// (usePaymentSession). Nút đó không tự kích hoạt Pro.
export function BankTransferScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const { colors } = useTheme();
  const { checkout, session, transferCheck, retry, stop, confirmTransferred } = usePaymentSession(
    planId,
    'bank_transfer',
    result => navigation.replace(MAIN_STACK_ROUTES.PAYMENT_SUCCESS, { result }),
  );
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copy = async (label: string, value: string) => {
    if (!(await copyToClipboard(value))) return;
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopiedLabel(label);
    copiedTimer.current = setTimeout(() => setCopiedLabel(null), COPIED_FEEDBACK_MS);
  };

  // Đơn vẫn còn hiệu lực ở server: chuyển tiền sau khi rời màn thì Pro vẫn được kích hoạt.
  const changeMethod = () => {
    stop();
    navigation.goBack();
  };

  if (checkout.isError) {
    return <PaymentFailedView message={checkout.error.message} onRetry={retry} onChangeMethod={changeMethod} />;
  }

  if (!session) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Chuyển khoản" onBack={changeMethod} />
        <LoadingState lines={6} />
      </ScreenContainer>
    );
  }

  const transfer = session.bankTransfer;
  if (!transfer) {
    return (
      <PaymentFailedView
        message="Máy chủ chưa trả thông tin tài khoản nhận tiền. Vui lòng thử lại hoặc chọn phương thức khác."
        onRetry={retry}
        onChangeMethod={changeMethod}
      />
    );
  }

  const plan = BILLING_PLAN_OPTIONS.find(option => option.id === planId);
  const amountLabel = `${session.amountVnd.toLocaleString('vi-VN')}đ`;
  const expiresAt = transfer.expiresAtIso ? format(new Date(transfer.expiresAtIso), 'HH:mm') : null;

  return (
    <ScreenContainer>
      <ScreenHeader title="Chuyển khoản" onBack={changeMethod} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-md py-sm">
        <AppCard className="gap-xs">
          <AppText variant="caption" color="secondary">
            Gói đã chọn
          </AppText>
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyLg">{`SmartMeal Pro · ${plan?.label ?? ''}`}</AppText>
            <AppText variant="h3">{amountLabel}</AppText>
          </View>
        </AppCard>

        <AppCard className="gap-xxs">
          <AppText variant="bodyMedium" className="pb-xxs">
            Thông tin chuyển khoản
          </AppText>
          <TransferInfoRow label="Ngân hàng" value={transfer.bankCode} />
          <TransferInfoRow
            label="Số tài khoản"
            value={transfer.accountNumber}
            selectable
            onCopy={() => void copy('số tài khoản', transfer.accountNumber)}
          />
          {transfer.accountName ? <TransferInfoRow label="Chủ tài khoản" value={transfer.accountName} /> : null}
          <TransferInfoRow
            label="Số tiền"
            value={amountLabel}
            onCopy={() => void copy('số tiền', String(session.amountVnd))}
          />
          <TransferInfoRow
            label="Nội dung"
            value={transfer.transferContent}
            selectable
            emphasize
            onCopy={() => void copy('nội dung chuyển khoản', transfer.transferContent)}
          />
          {copiedLabel ? (
            <View accessibilityLiveRegion="polite" className="flex-row items-center gap-xxs pt-xxs">
              <Check size={14} color={colors.primary} />
              <AppText variant="caption" color="onPrimarySoft">{`Đã sao chép ${copiedLabel}`}</AppText>
            </View>
          ) : null}
        </AppCard>

        <InlineBanner
          icon={<AlertTriangle size={20} color={colors.warning} />}
          title="Ghi đúng nội dung chuyển khoản"
          description={`Nội dung phải là ${transfer.transferContent} để hệ thống tự nhận ra giao dịch.${
            expiresAt ? ` Dùng được đến ${expiresAt}.` : ''
          }`}
        />

        <AppCard className="gap-xs">
          <AppText variant="bodyMedium">Các bước</AppText>
          {TRANSFER_STEPS.map((step, index) => (
            <AppText key={step} variant="body" color="secondary">
              {`${index + 1}. ${step}`}
            </AppText>
          ))}
        </AppCard>

        <View className="flex-row items-center justify-center gap-xs">
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText variant="caption" color="secondary">
            Đang chờ nhận tiền — Pro tự kích hoạt khi tiền vào tài khoản
          </AppText>
        </View>
        {transferCheck === 'not-received' ? (
          <AppText accessibilityLiveRegion="polite" variant="caption" color="secondary" className="text-center">
            Chưa nhận được tiền. Ngân hàng có thể mất 1–2 phút — app vẫn đang chờ, bạn không cần chuyển lại.
          </AppText>
        ) : null}
      </ScrollView>

      <View className="gap-sm py-md">
        <AppButton
          label="Tôi đã chuyển khoản"
          loading={transferCheck === 'checking'}
          onPress={confirmTransferred}
        />
        <AppButton label="Đổi phương thức" variant="outline" onPress={changeMethod} />
      </View>
    </ScreenContainer>
  );
}
