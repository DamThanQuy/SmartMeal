import { Flame, PawPrint } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/theme/ThemeProvider';
import type { PetSnippet } from '../types/dashboard.types';

export interface PetSnippetCardProps {
  pet: PetSnippet;
}

// design/Dashboard.dc.html "Bé Mầm" — trỏ tới Pet.dc.html (gamification, Đợt 8 mới dựng).
// Minh hoạ pet dùng icon placeholder thay vì vẽ lại SVG trong design (CLAUDE.md mục 10: ảnh
// trong design là placeholder). TODO: nối điều hướng + illustration thật khi Đợt 8 xong.
export function PetSnippetCard({ pet }: PetSnippetCardProps) {
  const { colors } = useTheme();

  return (
    <View style={shadows.card} className="flex-row items-center gap-md rounded-card bg-surface p-md">
      <View className="h-[96px] w-[96px] items-center justify-center rounded-lg bg-primary-soft">
        <PawPrint size={40} color={colors.primary} />
      </View>
      <View className="flex-1 gap-xs">
        <View className="flex-row items-center justify-between">
          <AppText variant="bodyMedium">{`${pet.name} · Level ${pet.level}`}</AppText>
          <AppBadge
            tone="warning"
            label={`${pet.streakDays} ngày`}
            icon={<Flame size={14} color={colors.warningText} />}
          />
        </View>
        <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
          <View
            className="h-[8px] rounded-pill bg-primary"
            style={{ width: `${pet.progressPercent}%` }}
          />
        </View>
        <AppText variant="body" color="secondary">
          {pet.message}
        </AppText>
      </View>
    </View>
  );
}
