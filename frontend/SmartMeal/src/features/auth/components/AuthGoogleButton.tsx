import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { AppText } from '@/components/ui/AppText';

export interface AuthGoogleButtonProps
  extends Omit<PressableProps, 'children'> {
  label: string;
}

// design/Main.dc.html + Register.dc.html — nút Google chỉ đổi label ("Tiếp tục với Google" /
// "Đăng ký với Google"), UI giống hệt AppButton variant="outline" nhưng có thêm badge "G" nên
// tách riêng thay vì ép AppButton nhận thêm slot icon trái không dùng ở chỗ khác.
export function AuthGoogleButton({ label, ...rest }: AuthGoogleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-[48px] flex-row items-center justify-center gap-sm rounded-md border border-border bg-surface active:opacity-70"
      {...rest}
    >
      <View className="h-[24px] w-[24px] items-center justify-center rounded-pill border border-border">
        <AppText variant="bodyMedium">G</AppText>
      </View>
      <AppText variant="bodyMedium">{label}</AppText>
    </Pressable>
  );
}
