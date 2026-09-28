import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { shadows } from '@/theme/shadows';

export interface AppSwitchProps extends Omit<PressableProps, 'children' | 'onPress' | 'disabled'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Bắt buộc — switch không có text hiển thị nên luôn cần accessibilityLabel. */
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
}

// UI primitive mới — toggle bật/tắt (design/HealthConnect.dc.html, Reminders.dc.html,
// Notifications.dc.html — Đợt 7), chưa có trong danh sách gốc CLAUDE.md mục 7. Kích thước
// 48×28 theo đúng design; vùng chạm mở rộng qua hitSlop để đạt tối thiểu 44px, cùng cách làm
// với AppCheckbox (components/ui/AppCheckbox.tsx).
export function AppSwitch({
  checked,
  onChange,
  accessibilityLabel,
  disabled = false,
  className = '',
  ...rest
}: AppSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      className={`h-[28px] w-[48px] flex-row rounded-pill p-[3px] ${
        checked ? 'bg-primary' : 'bg-border'
      } ${disabled ? 'opacity-40' : ''} ${className}`}
      style={{ alignItems: 'center', justifyContent: checked ? 'flex-end' : 'flex-start' }}
      {...rest}
    >
      <View className="h-[22px] w-[22px] rounded-full bg-surface" style={shadows.card} />
    </Pressable>
  );
}
