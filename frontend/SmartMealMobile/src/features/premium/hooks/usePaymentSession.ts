import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { BillingPlanId } from '@/state/premium/premiumStore';
import { PaymentCheckTrigger } from '../services/paymentCheckTrigger';
import { paymentReturnUrl } from '../services/paymentPage';
import type { CheckoutResult, CheckoutSession, SelectablePaymentMethodId } from '../types/premium.types';
import { useCheckoutPremium } from './useCheckoutPremium';

/** Kết quả lần bấm "Tôi đã chuyển khoản" gần nhất. */
export type TransferCheckState = 'idle' | 'checking' | 'not-received';

/**
 * Vòng đời một lần thanh toán trên màn chờ (PaymentPending, BankTransfer): tạo giao dịch khi vào màn, nhận phiên (mã QR /
 * số tài khoản), chờ server xác nhận rồi gọi `onPaid`, dừng chờ khi rời màn. Quay lại app (vd. từ app ngân hàng) hoặc
 * bấm "Tôi đã chuyển khoản" thì hỏi trạng thái ngay. Pro chỉ bật khi server xác nhận đã nhận tiền (BR-241/242).
 */
export function usePaymentSession(
  planId: BillingPlanId,
  paymentMethodId: SelectablePaymentMethodId,
  onPaid: (result: CheckoutResult) => void,
) {
  const checkout = useCheckoutPremium();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [transferCheck, setTransferCheck] = useState<TransferCheckState>('idle');
  const [trigger] = useState(() => new PaymentCheckTrigger());
  const hasStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  /** Đang đợi kết quả của lần bấm "Tôi đã chuyển khoản". */
  const awaitingTransferCheck = useRef(false);

  const start = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    awaitingTransferCheck.current = false;
    setSession(null);
    setTransferCheck('idle');
    checkout.mutate(
      {
        planId,
        paymentMethodId,
        onSession: setSession,
        signal: controller.signal,
        trigger,
        // PayOS chuyển về đúng app đang mở (Expo Go: exp://…) → AppState "active" bên dưới hỏi trạng thái ngay.
        returnUrl: paymentMethodId === 'payos' ? paymentReturnUrl() : undefined,
        onPending: () => {
          if (!awaitingTransferCheck.current) return;
          awaitingTransferCheck.current = false;
          setTransferCheck('not-received');
        },
      },
      { onSuccess: onPaid },
    );
  };

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      start();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy 1 lần lúc mount, tránh gọi lại checkout khi mutation state đổi.
  }, []);

  // Quay lại SmartMeal sau khi chuyển khoản trong app ngân hàng → hỏi trạng thái ngay.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') trigger.checkNow();
    });
    return () => subscription.remove();
  }, [trigger]);

  const retry = () => {
    checkout.reset();
    start();
  };

  /** Rời màn: ngừng chờ (giao dịch vẫn được kích hoạt ở server nếu tiền tới sau). */
  const stop = () => abortRef.current?.abort();

  /** "Tôi đã chuyển khoản": hỏi ngay; vẫn chưa thấy tiền thì `transferCheck` = 'not-received'. */
  const confirmTransferred = () => {
    awaitingTransferCheck.current = true;
    setTransferCheck('checking');
    trigger.checkNow();
  };

  return { checkout, session, transferCheck, retry, stop, confirmTransferred };
}
