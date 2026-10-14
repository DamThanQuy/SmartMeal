import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { shadows } from '@/theme/shadows';

export type AppCardVariant = 'default' | 'outlined' | 'soft';

export interface AppCardProps extends ViewProps {
  variant?: AppCardVariant;
  className?: string;
  children?: React.ReactNode;
  /** Nếu được set, card sẽ tự thêm hiệu ứng lift khi hover (chỉ web/desktop). */
  hoverLift?: boolean;
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
  hoverLift = true,
  ...rest
}: AppCardProps) {
  const cardClassName = `rounded-card p-md ${VARIANT_CLASSNAME[variant]} ${className} ${
    hoverLift ? 'transition-transform duration-200 ease-in-out hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]' : ''
  }`;

  const baseStyle: ViewStyle[] = [];
  if (variant !== 'outlined') baseStyle.push(shadows.card);
  if (style) baseStyle.push(style as ViewStyle);

  return (
    <View
      className={cardClassName}
      style={baseStyle}
      {...rest}
    >
      {children}
    </View>
  );
}
