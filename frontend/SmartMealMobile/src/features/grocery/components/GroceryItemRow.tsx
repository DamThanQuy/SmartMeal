import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { GroceryItem } from '../types/grocery.types';

export interface GroceryItemRowProps {
  item: GroceryItem;
  onToggle: () => void;
}

// design/Grocery.dc.html — hàng check-off (BR-173). Dùng lại đúng token ô vuông của AppCheckbox
// (components/ui) nhưng không gọi trực tiếp được vì bố cục ở đây có 2 dòng nhãn + số lượng bên
// phải, còn AppCheckbox chỉ nhận 1 dòng label (không có slot phải) — xem .claude/rules/component-reuse.md.
export function GroceryItemRow({ item, onToggle }: GroceryItemRowProps) {
  const { colors } = useTheme();
  const purchased = item.status === 'purchased';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={item.name}
      accessibilityState={{ checked: purchased }}
      onPress={onToggle}
      className="min-h-[48px] flex-row items-center gap-sm border-t border-border py-xs"
    >
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-sm border ${
          purchased ? 'border-primary bg-primary' : 'border-border bg-surface'
        }`}
      >
        {purchased ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
      </View>
      <View className="flex-1 gap-xxs">
        <AppText
          variant="bodyLg"
          color={purchased ? 'muted' : 'primary'}
          className={purchased ? 'line-through' : ''}
        >
          {item.name}
        </AppText>
        {item.mergedFromRecipeCount >= 2 ? (
          <AppText variant="caption" color="secondary">
            {`Gộp từ ${item.mergedFromRecipeCount} món`}
          </AppText>
        ) : null}
      </View>
      <AppText variant="body" color="secondary">
        {item.amountLabel}
      </AppText>
    </Pressable>
  );
}
