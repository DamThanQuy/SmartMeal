import { Check, Flame, Footprints } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppCard, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { ActivitySummary } from '../types/dashboard.types';

export interface ActivityCardProps {
  activity: ActivitySummary;
  className?: string;
}

// design/Dashboard.dc.html mục "Vận động" — Health Connect mock (BR chưa đánh số), chỉ hiển
// thị, chưa có nút "Đồng bộ ngay" (để Đợt 7 — HealthConnect.dc.html).
export function ActivityCard({ activity, className = '' }: ActivityCardProps) {
  const { colors } = useTheme();

  return (
    <AppCard className={`gap-sm ${className}`}>
      <View className="flex-row items-center justify-between">
        <AppText variant="h3">Vận động</AppText>
        <View className="h-[24px] flex-row items-center gap-xxs rounded-pill bg-primary-soft px-sm">
          <Check size={14} color={colors.onPrimarySoft} />
          <AppText variant="caption" className="font-sans-semibold text-on-primary-soft">
            {`Đã đồng bộ ${activity.syncedAtLabel}`}
          </AppText>
        </View>
      </View>
      <View className="flex-row gap-md">
        <View className="flex-1 flex-row items-center gap-sm">
          <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
            <Footprints size={20} color={colors.primary} />
          </View>
          <View>
            <AppText variant="bodyMedium">{activity.steps.toLocaleString('vi-VN')}</AppText>
            <AppText variant="caption" color="secondary">
              bước chân
            </AppText>
          </View>
        </View>
        <View className="flex-1 flex-row items-center gap-sm">
          <View className="h-[40px] w-[40px] items-center justify-center rounded-md bg-primary-soft">
            <Flame size={20} color={colors.primary} />
          </View>
          <View>
            <AppText variant="bodyMedium">{`${activity.caloriesBurned} kcal`}</AppText>
            <AppText variant="caption" color="secondary">
              tiêu hao
            </AppText>
          </View>
        </View>
      </View>
      <AppText variant="caption" color="secondary">
        Nguồn: Health Connect · Đã cộng vào ngân sách calo
      </AppText>
    </AppCard>
  );
}
