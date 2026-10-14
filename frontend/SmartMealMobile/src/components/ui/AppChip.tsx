import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { AnimatedPressable } from './AnimatedPressable';

export interface AppChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected?: boolean;
  className?: string;
}

// docs/design.md mục 8 (Radius: Chip = pill). Height chip không có spec cụ thể trong
// design.md — 36px là giá trị derived, tách riêng ở component này (không đưa vào spacing scale).
export function AppChip({
  label,
  selected = false,
  className = '',
  ...rest
}: AppChipProps) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      pressScale={0.94}
      pressStiffness={360}
      className={`h-[36px] items-center justify-center rounded-pill border px-md active:opacity-70 disabled:opacity-40 ${
        selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
      } ${className}`}
      {...rest}
    >
      <AppText
        variant="bodyMedium"
        color={selected ? 'onPrimarySoft' : 'secondary'}
      >
        {label}
      </AppText>
    </AnimatedPressable>
  );
}
