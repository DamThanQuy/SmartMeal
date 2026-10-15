import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { renderGoogleButton } from '../services/googleSignIn';

export interface AuthGoogleButtonProps {
  label: string;
  onCredential: (credential: string) => void;
  /** Đang gọi /auth/google — chặn bấm lại. */
  disabled?: boolean;
}

// design/Main.dc.html + Register.dc.html — nút "Tiếp tục với Google". Trên Web, Google Identity
// Services bắt buộc dùng nút chính thức của Google (render vào View này). Native chưa hỗ trợ nên
// không render gì; màn hình chỉ hiện nút khi `useGoogleLogin().isAvailable`.
export function AuthGoogleButton({ label, onCredential, disabled = false }: AuthGoogleButtonProps) {
  const googleButtonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !googleButtonRef.current) return;
    return renderGoogleButton(googleButtonRef.current, onCredential);
  }, [onCredential]);

  if (Platform.OS !== 'web') return null;

  return (
    <View
      ref={googleButtonRef as never}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      pointerEvents={disabled ? 'none' : 'auto'}
      className={`min-h-[48px] w-full items-center justify-center overflow-hidden ${disabled ? 'opacity-40' : ''}`}
    />
  );
}
