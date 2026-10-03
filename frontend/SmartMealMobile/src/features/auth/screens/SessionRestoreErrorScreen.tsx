import React, { useState } from 'react';
import { ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { bootstrapSession } from '../services/sessionService';

// docs/fetch-api/part1 §4.7 — có token nhưng GET /auth/me không tới được máy chủ (mất mạng,
// timeout, lỗi 5xx). Không đăng xuất và không xóa token: người dùng chỉ cần thử lại. Hiển thị bởi
// AppNavigator khi authStore.bootstrapStatus = 'failed'.
export function SessionRestoreErrorScreen() {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await bootstrapSession();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <ScreenContainer>
      {retrying ? (
        <LoadingState variant="spinner" />
      ) : (
        <ErrorState
          title="Không kết nối được máy chủ"
          description="Kiểm tra kết nối mạng rồi thử lại. Phiên đăng nhập của bạn vẫn được giữ nguyên."
          onRetry={() => {
            void handleRetry();
          }}
        />
      )}
    </ScreenContainer>
  );
}
