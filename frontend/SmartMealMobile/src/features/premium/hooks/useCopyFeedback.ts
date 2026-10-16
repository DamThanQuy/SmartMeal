import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '../services/clipboard';

/** Thời gian hiện dòng "Đã sao chép …". */
const COPIED_FEEDBACK_MS = 2000;

/** Sao chép vào bộ nhớ tạm và nhớ vừa chép gì trong 2 giây để hiện "Đã sao chép …" (trang chuyển khoản, mở app ngân hàng). */
export function useCopyFeedback() {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async (label: string, value: string): Promise<boolean> => {
    if (!(await copyToClipboard(value))) return false;
    if (timer.current) clearTimeout(timer.current);
    setCopiedLabel(label);
    timer.current = setTimeout(() => setCopiedLabel(null), COPIED_FEEDBACK_MS);
    return true;
  };

  return { copiedLabel, copy };
}
