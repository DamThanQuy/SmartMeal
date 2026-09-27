import React from 'react';
import { View, type ViewProps } from 'react-native';
import { shadows } from '@/theme/shadows';

export type AppCardVariant = 'default' | 'outlined' | 'soft';

export interface AppCardProps extends ViewProps {
  variant?: AppCardVariant;
  className?: string;
  children?: React.ReactNode;
}

// docs/design.md mục 42 (Card System) — Standard/Nutrition/Recipe/Meal/Pet/Alert Card đều
// phải build từ AppCard để dùng chung radius/shadow/padding/typography (không tạo card mới).
const VARIANT_CLASSNAME: Record<AppCardVariant, string> = {
  default: 'bg-surface',
  outlined: 'border border-border bg-surface',
  soft: 'bg-primary-soft',
};

export function AppCard({
  variant = 'default',
  className = '',
  style,
  children,
  ...rest
}: AppCardProps) {
  return (
    <View
      className={`rounded-card p-md ${VARIANT_CLASSNAME[variant]} ${className}`}
      style={[variant === 'outlined' ? undefined : shadows.card, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
