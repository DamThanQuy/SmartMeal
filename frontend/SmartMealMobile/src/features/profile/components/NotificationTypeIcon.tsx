import {
  Award,
  Bell,
  Crown,
  Droplet,
  PawPrint,
  RefreshCw,
  ShoppingCart,
  Target,
  Trophy,
} from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { NotificationIcon } from '../types/profile.types';

const ICON_BY_TYPE: Record<NotificationIcon, typeof Droplet> = {
  quickLog: Target,
  pet: PawPrint,
  water: Droplet,
  healthConnect: RefreshCw,
  grocery: ShoppingCart,
  challenge: Trophy,
  badge: Award,
  premium: Crown,
  general: Bell,
};

export interface NotificationTypeIconProps {
  icon: NotificationIcon;
}

// Ô biểu tượng theo nhóm thông báo — dùng chung cho màn Thông báo và banner thông báo real-time.
export function NotificationTypeIcon({ icon }: NotificationTypeIconProps) {
  const { colors } = useTheme();
  const Icon = ICON_BY_TYPE[icon];
  return (
    <View className="h-[44px] w-[44px] items-center justify-center rounded-md bg-primary-soft">
      <Icon size={22} color={colors.primary} />
    </View>
  );
}
