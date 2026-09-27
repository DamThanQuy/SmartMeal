import { Barcode, Camera, Mic, Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface QuickActionGridProps {
  onSnap: () => void;
  onVoice: () => void;
  onSearch: () => void;
  className?: string;
}

// design/design.md mục 18 (Quick Log) + Dashboard.dc.html — 4 action, mỗi cái icon rõ ràng.
// "Quét sản phẩm" trỏ Barcode.dc.html (Đợt 4 mới dựng) nên tạm disable.
export function QuickActionGrid({ onSnap, onVoice, onSearch, className = '' }: QuickActionGridProps) {
  const { colors } = useTheme();

  const items = [
    { label: 'Chụp món', icon: Camera, onPress: onSnap, disabled: false },
    { label: 'Nói để ghi', icon: Mic, onPress: onVoice, disabled: false },
    { label: 'Tìm món', icon: Search, onPress: onSearch, disabled: false },
    { label: 'Quét sản phẩm', icon: Barcode, onPress: () => {}, disabled: true },
  ];

  return (
    <View className={`flex-row justify-between ${className}`}>
      {items.map(item => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ disabled: item.disabled }}
          disabled={item.disabled}
          onPress={item.onPress}
          className="min-h-[76px] items-center gap-xs disabled:opacity-40"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-lg bg-primary-soft">
            <item.icon size={24} color={colors.primary} />
          </View>
          <AppText variant="caption">{item.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}
