import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';

export type AppBadgeTone = 'primary' | 'info' | 'warning' | 'error' | 'neutral';

export interface AppBadgeProps {
  label: string;
  icon?: React.ReactNode;
  tone?: AppBadgeTone;
  className?: string;
}

// UI primitive mới — pill nhỏ icon+text lặp lại rất nhiều nơi trong Đợt 2/3 ("AI · đã xác
// nhận", "Ước tính từ hình ảnh", "Dữ liệu đã xác minh", "Chưa chắc chắn"...). Không có trong
// danh sách gốc CLAUDE.md mục 7 nhưng cùng tinh thần AppChip (docs/design.md mục 42 Card
// System nói badge là 1 phần Card, không phải component chọn lựa như AppChip nên tách riêng).
const TONE_CLASSNAME: Record<AppBadgeTone, { container: string; text: string }> = {
  primary: { container: 'bg-primary-soft', text: 'text-on-primary-soft' },
  info: { container: 'bg-info-soft', text: 'text-info-text' },
  warning: { container: 'bg-warning-soft', text: 'text-warning-text' },
  error: { container: 'bg-error-soft', text: 'text-error-text' },
  neutral: { container: 'bg-surface-subtle', text: 'text-text-secondary' },
};

export function AppBadge({ label, icon, tone = 'primary', className = '' }: AppBadgeProps) {
  const toneStyle = TONE_CLASSNAME[tone];

  return (
    <View
      className={`h-[24px] flex-row items-center gap-xxs self-start rounded-pill px-sm ${toneStyle.container} ${className}`}
    >
      {icon}
      <AppText variant="caption" className={`font-sans-semibold ${toneStyle.text}`}>
        {label}
      </AppText>
    </View>
  );
}
