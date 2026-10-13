import { Image } from 'expo-image';
import { UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface RecipeImageProps {
  imageUrl?: string;
  /** Kích thước icon placeholder khi chưa có ảnh. */
  iconSize?: number;
  className?: string;
  accessibilityLabel?: string;
}

// Ảnh món ăn từ backend; chưa có ảnh thì hiện placeholder (CLAUDE.md §10 — ảnh trong design là placeholder).
export function RecipeImage({ imageUrl, iconSize = 28, className = '', accessibilityLabel }: RecipeImageProps) {
  const { colors } = useTheme();

  return (
    <View className={`items-center justify-center overflow-hidden bg-primary-soft ${className}`}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={150}
          accessibilityLabel={accessibilityLabel}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <UtensilsCrossed size={iconSize} color={colors.primary} />
      )}
    </View>
  );
}
