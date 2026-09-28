import React, { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

// RN 0.86 (Expo SDK 57) chưa export type `TextInputInstance` (thêm ở RN 0.87+, dùng ở bản CLI cũ)
// — dùng React.ComponentRef để lấy type instance không phụ thuộc tên export cụ thể của từng bản RN.
type TextInputInstance = React.ComponentRef<typeof TextInput>;

export interface OtpCodeInputProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
}

// features/auth/components — control 6 ô nhập OTP đặc thù cho luồng xác thực
// (design/OTP.dc.html), tự chuyển focus khi nhập/xoá, viền xanh khi đang focus.
export function OtpCodeInput({ length = 6, value, onChange }: OtpCodeInputProps) {
  const { colors } = useTheme();
  const inputRefs = useRef<Array<TextInputInstance | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChangeDigit = (index: number, digit: string) => {
    const sanitized = digit.replace(/[^0-9]/g, '').slice(-1);
    const next = [...value];
    next[index] = sanitized;
    onChange(next);
    if (sanitized && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View className="flex-row gap-xs">
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={ref => {
            inputRefs.current[index] = ref;
          }}
          accessibilityLabel={`Số thứ ${index + 1}`}
          value={value[index] ?? ''}
          onChangeText={digit => handleChangeDigit(index, digit)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(current => (current === index ? null : current))}
          keyboardType="number-pad"
          maxLength={1}
          placeholderTextColor={colors.textMuted}
          className={`h-[56px] flex-1 rounded-md border bg-surface text-center font-sans-bold text-h2 text-text-primary ${
            focusedIndex === index ? 'border-border-focus' : 'border-border'
          }`}
        />
      ))}
    </View>
  );
}
