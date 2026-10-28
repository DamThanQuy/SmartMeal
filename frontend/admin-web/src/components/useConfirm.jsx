import React, { useCallback, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

// Mở hộp xác nhận dùng chung (ConfirmDialog) và chờ người dùng trả lời:
//   const { confirm, dialog } = useConfirm();
//   if (!(await confirm('Xóa món "Phở"?', { confirmLabel: 'Xóa món', danger: true }))) return;
//   …và render {dialog} trong JSX của màn.
export function useConfirm() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    (message, { title = 'Xác nhận thao tác', confirmLabel = 'Xác nhận', danger = false } = {}) =>
      new Promise((resolve) => setRequest({ message, title, confirmLabel, danger, resolve })),
    [],
  );

  const close = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  const dialog = request ? (
    <ConfirmDialog
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      danger={request.danger}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null;

  return { confirm, dialog };
}
