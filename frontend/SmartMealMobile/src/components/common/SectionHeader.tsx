import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
}

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  className = '',
}: SectionHeaderProps) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <AppText variant="h2">{title}</AppText>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
        >
          <AppText variant="bodyMedium" color="onPrimarySoft">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
