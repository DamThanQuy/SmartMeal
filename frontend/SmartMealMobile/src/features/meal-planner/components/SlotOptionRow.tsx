import { UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface SlotOptionRowProps {
  name: string;
  durationMinutes: number;
  calories: number;
  reasonLabel?: string;
  selected: boolean;
  onPress: () => void;
}

// design/SlotPicker.dc.html — hàng gợi ý dạng radio (chọn 1), build trên token chung
// (rounded-card, border) thay vì tạo card mới (docs/design.md mục 42).
export function SlotOptionRow({
  name,
  durationMinutes,
  calories,
  reasonLabel,
  selected,
  onPress,
}: SlotOptionRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-sm rounded-card border p-sm ${
        selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
      }`}
    >
      <View className="h-[64px] w-[64px] items-center justify-center rounded-md bg-primary-soft">
        <UtensilsCrossed size={20} color={colors.primary} />
      </View>
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyMedium" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color="secondary">
          {`${durationMinutes} phút · ${calories} kcal`}
        </AppText>
        {reasonLabel ? <AppBadge label={reasonLabel} /> : null}
      </View>
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
          selected ? 'border-primary' : 'border-border'
        }`}
      >
        {selected ? <View className="h-[12px] w-[12px] rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}
