import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { ChevronDown, ChevronUp, ExternalLink, Smartphone } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { InlineBanner } from '@/components/common';
import { AppBadge, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { PaymentFailedView } from '../components/PaymentFailedView';
import { PaymentLoadingView, PaymentScreenLayout } from '../components/PaymentScreenLayout';
import { TransferContentNotice } from '../components/TransferContentNotice';
import { TransferDetailsCard } from '../components/TransferDetailsCard';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { usePaymentSession } from '../hooks/usePaymentSession';
import { bankAppLogoUrl, bankReturnPageUrl, buildBankAppLink, openBankApp } from '../services/bankAppLink';
import { paymentReturnUrl } from '../services/paymentPage';
import { BANK_APPS, type BankApp } from '../types/bankApp.types';

type Props = NativeStackScreenProps<MainStackParamList, 'BankApp'>;

const TITLE = 'Mở app ngân hàng';
const BANK_LOGO_SIZE = 40;

interface OpenedBankApp {
  name: string;
  /** App tự điền thông tin; false = SmartMeal đã chép nội dung để người dùng dán. */
  prefilled: boolean;
}

interface BankAppRowProps {
  app: BankApp;
  prefill: boolean;
  onPress: () => void;
}

function BankAppRow({ app, prefill, onPress }: BankAppRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mở ${app.name}`}
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-sm border-t border-border py-xs active:opacity-70"
    >
      <View className="overflow-hidden rounded-md border border-border bg-surface">
        <Image
          source={{ uri: bankAppLogoUrl(app.id) }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
          style={{ width: BANK_LOGO_SIZE, height: BANK_LOGO_SIZE }}
        />
      </View>
      <AppText variant="body" className="flex-1">
        {app.name}
      </AppText>
      {prefill ? <AppBadge label="Tự điền" /> : null}
      <ExternalLink size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

// Phương thức "Mở app ngân hàng" (BR-241/242): tạo đơn BANK_APP khi vào màn rồi cho người dùng chọn app ngân hàng của mình
// — mở thẳng app đó qua link VietQR (dl.vietqr.io). App có nhãn "Tự điền" nhận sẵn số tài khoản/số tiền/nội dung; app khác
// chỉ được mở lên nên SmartMeal chép sẵn nội dung để dán. Tiền vào cùng tài khoản SePay, server tự xác nhận theo nội
// dung. Dùng chung khung PaymentScreenLayout với màn quét mã (SePay/PayOS).
export function BankAppScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const { colors } = useTheme();
  const { checkout, session, transferCheck, retry, stop, confirmTransferred } = usePaymentSession(
    planId,
    'bank_app',
    result => navigation.replace(MAIN_STACK_ROUTES.PAYMENT_SUCCESS, { result }),
  );
  const { copiedLabel, copy } = useCopyFeedback();
  const [openedApp, setOpenedApp] = useState<OpenedBankApp | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Đơn vẫn còn hiệu lực ở server: chuyển tiền sau khi rời màn thì Pro vẫn được kích hoạt.
  const changeMethod = () => {
    stop();
    navigation.goBack();
  };

  if (checkout.isError) {
    return <PaymentFailedView message={checkout.error.message} onRetry={retry} onChangeMethod={changeMethod} />;
  }

  if (!session) {
    return <PaymentLoadingView title={TITLE} onBack={changeMethod} />;
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

  const canPrefill = Boolean(transfer.vietQrBankCode);
  const apps = BANK_APPS.filter(app => Platform.OS !== 'ios' || !app.androidOnly);

  const openApp = async (app: BankApp) => {
    setOpenError(null);
    const prefilled = canPrefill && Boolean(app.autofill);
    // App không tự điền: chép sẵn nội dung để người dùng chỉ việc dán vào ô nội dung chuyển khoản.
    if (!prefilled) await copy('nội dung chuyển khoản', transfer.transferContent);

    const link = buildBankAppLink({
      appId: app.id,
      transfer,
      amountVnd: session.amountVnd,
      returnPageUrl: bankReturnPageUrl(paymentReturnUrl()),
    });
    if (!(await openBankApp(link))) {
      setOpenError(`Không mở được ${app.name}. Hãy dùng thông tin chuyển khoản bên dưới.`);
      setShowDetails(true);
      return;
    }
    setOpenedApp({ name: app.name, prefilled });
  };

  return (
    <PaymentScreenLayout
      title={TITLE}
      planId={planId}
      amountVnd={session.amountVnd}
      detail={`Nội dung chuyển khoản: ${transfer.transferContent}`}
      transferCheck={transferCheck}
      onConfirmTransferred={confirmTransferred}
      onChangeMethod={changeMethod}
    >
      {openedApp ? (
        <InlineBanner
          tone="success-soft"
          icon={<Smartphone size={20} color={colors.primary} />}
          title={`Đã mở ${openedApp.name}`}
          description={
            openedApp.prefilled
              ? 'Kiểm tra số tiền và nội dung đã điền sẵn rồi xác nhận chuyển khoản. Xong thì quay lại SmartMeal.'
              : `Nội dung ${transfer.transferContent} đã được sao chép — dán vào ô nội dung, chuyển đúng số tiền rồi quay lại SmartMeal.`
          }
        />
      ) : null}
      {openError ? (
        <AppText variant="caption" color="error" className="text-center">
          {openError}
        </AppText>
      ) : null}

      <AppCard className="gap-0">
        <AppText variant="h3" className="pb-xxs">
          Chọn app ngân hàng của bạn
        </AppText>
        <AppText variant="caption" color="secondary" className="pb-sm">
          {canPrefill
            ? 'App có nhãn "Tự điền" điền sẵn số tài khoản, số tiền và nội dung. App khác: SmartMeal tự sao chép nội dung để bạn dán.'
            : 'SmartMeal sẽ sao chép nội dung chuyển khoản để bạn dán vào app ngân hàng.'}
        </AppText>
        {apps.map(app => (
          <BankAppRow
            key={app.id}
            app={app}
            prefill={canPrefill && Boolean(app.autofill)}
            onPress={() => void openApp(app)}
          />
        ))}
      </AppCard>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showDetails }}
        onPress={() => setShowDetails(current => !current)}
        className="min-h-[44px] flex-row items-center justify-center gap-xxs"
      >
        <AppText variant="bodyMedium" color="onPrimarySoft">
          {showDetails ? 'Ẩn thông tin chuyển khoản' : 'Không thấy ngân hàng của bạn? Xem thông tin chuyển khoản'}
        </AppText>
        {showDetails ? (
          <ChevronUp size={16} color={colors.onPrimarySoft} />
        ) : (
          <ChevronDown size={16} color={colors.onPrimarySoft} />
        )}
      </Pressable>
      {showDetails ? (
        <TransferDetailsCard
          transfer={transfer}
          amountVnd={session.amountVnd}
          onCopy={(label, value) => void copy(label, value)}
          copiedLabel={copiedLabel}
        />
      ) : null}

      <TransferContentNotice transfer={transfer} amountVnd={session.amountVnd} />
    </PaymentScreenLayout>
  );
}
