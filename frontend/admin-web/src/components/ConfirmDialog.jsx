import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

// Hộp xác nhận dùng chung thay cho window.confirm (mở qua hook useConfirm): cùng kiểu modal với các form khác của
// trang quản trị, nút Hủy / Xác nhận ghi rõ hành động, Esc hoặc bấm ra ngoài để hủy. Thao tác nguy hiểm (xóa…) đặt
// sẵn tiêu điểm vào nút Hủy. Vẽ ở cuối <body> (portal) nên luôn nằm trên modal đang mở của màn (vd. hủy Pro từ hộp
// thoại cấp Pro).
export default function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelHandler = useRef(onCancel);

  useEffect(() => {
    cancelHandler.current = onCancel;
  });

  useEffect(() => {
    (danger ? cancelRef : confirmRef).current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') cancelHandler.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [danger]);

  return createPortal(
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div
        className="modal-content confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="confirm-dialog-title" className="modal-title confirm-dialog-title">
            {danger ? <AlertTriangle size={20} aria-hidden="true" /> : null}
            {title}
          </h3>
        </div>
        <div className="modal-body">
          <p id="confirm-dialog-message" className="confirm-dialog-message">
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" ref={cancelRef} className="btn btn-secondary" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
