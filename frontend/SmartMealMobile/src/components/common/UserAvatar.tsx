import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import type { AppTextVariant } from '@/theme/typography';

export interface UserAvatarProps {
  /** Họ tên — lấy chữ cái đầu làm ảnh thay thế khi chưa có ảnh đại diện. */
  name?: string | null;
  /** URL ảnh đại diện (null/rỗng → hiện chữ cái đầu). */
  uri?: string | null;
  /** Cạnh hình vuông (dp); ảnh luôn bo tròn. */
  size?: number;
  /** Cỡ chữ của chữ cái đầu. */
  textVariant?: AppTextVariant;
}

// Ảnh đại diện dùng chung (Profile, Settings, EditProfile) để mọi nơi hiện cùng một ảnh. `size` là
// giá trị động nên đặt bằng style thay vì className (CLAUDE.md mục 6).
export function UserAvatar({ name, uri, size = 56, textVariant = 'h2' }: UserAvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={dimension}
        contentFit="cover"
        accessibilityLabel="Ảnh đại diện"
      />
    );
  }

  return (
    <View style={dimension} className="items-center justify-center bg-primary-soft">
      <AppText variant={textVariant} color="onPrimarySoft">
        {(name?.trim() || 'U').charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}
