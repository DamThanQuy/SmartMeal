import { Camera } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { UserAvatar } from '@/components/common';
import type { AppTextVariant } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

export interface EditableAvatarProps {
  name?: string | null;
  uri?: string | null;
  size: number;
  textVariant?: AppTextVariant;
  /** Đang tải ảnh lên / đang xóa — hiện vòng xoay và chặn bấm. */
  busy?: boolean;
  onPress: () => void;
}

// Ảnh đại diện bấm được (cả khối ảnh là vùng chạm ≥ 44) kèm biểu tượng camera ở góc để người dùng
// biết là đổi được. Kích thước phụ thuộc `size` nên đặt bằng style (CLAUDE.md mục 6).
export function EditableAvatar({ name, uri, size, textVariant, busy = false, onPress }: EditableAvatarProps) {
  const { colors } = useTheme();
  const badgeSize = Math.round(size * 0.4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đổi ảnh đại diện"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={{ width: size, height: size }}
      className="active:opacity-80"
    >
      <UserAvatar name={name} uri={uri} size={size} textVariant={textVariant} />
      {busy ? (
        <View
          className="absolute inset-0 items-center justify-center bg-overlay/40"
          style={{ borderRadius: size / 2 }}
        >
          <ActivityIndicator color={colors.onPrimary} />
        </View>
      ) : null}
      <View
        className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-background bg-primary"
        style={{ width: badgeSize, height: badgeSize }}
      >
        <Camera size={Math.round(badgeSize * 0.5)} color={colors.onPrimary} />
      </View>
    </Pressable>
  );
}
