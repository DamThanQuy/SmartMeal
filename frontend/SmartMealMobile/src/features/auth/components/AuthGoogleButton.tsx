import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, View, type PressableProps } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { renderGoogleButton } from '../services/googleSignIn';

export interface AuthGoogleButtonProps
  extends Omit<PressableProps, 'children'> {
  label: string;
  onCredential?: (credential: string) => void;
}

export function AuthGoogleButton({ label, onCredential, disabled = false, ...rest }: AuthGoogleButtonProps) {
  const googleButtonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !onCredential || !googleButtonRef.current) return;
    return renderGoogleButton(googleButtonRef.current, onCredential);
  }, [onCredential]);

  if (Platform.OS === 'web' && onCredential) {
    return (
      <View
        ref={googleButtonRef as never}
        accessibilityLabel={label}
        className="min-h-[48px] w-full items-center justify-center overflow-hidden"
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      android_ripple={{ radius: 24, color: 'rgba(0,0,0,0.08)' }}
      {...rest}
      className={`h-[48px] flex-row items-center justify-center gap-sm rounded-md border border-border bg-surface active:opacity-70 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <View className="h-[24px] w-[24px] items-center justify-center rounded-pill border border-border">
        <AppText variant="bodyMedium">G</AppText>
      </View>
      <AppText variant="bodyMedium">{label}</AppText>
    </Pressable>
  );
}
