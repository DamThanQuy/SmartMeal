import { ArrowLeftRight, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIconButton, AppText } from '@/components/ui';
import { RecipeImage } from '@/features/recipes';
import { useTheme } from '@/theme/ThemeProvider';
import type { PlannedMealSlot } from '../types/mealPlanner.types';

export interface MealSlotSectionProps {
  mealTitle: string;
  slot: PlannedMealSlot | null;
  onPressChange: () => void;
  onPressDetail?: () => void;
  /** "Đã nấu" — PATCH /mealplanner/{id}/complete. */
  onToggleCompleted?: () => void;
  /** Bỏ món khỏi ô — DELETE /mealplanner/{id}. */
  onRemove?: () => void;
  /** Đang lưu thay đổi của ô này. */
  busy?: boolean;
  className?: string;
}

// design/MealPlanner.dc.html (docs/design.md mục 34 — Meal Planner Card): mỗi bữa 1 section,
// slot đã chọn hiện "Đổi món", slot trống hiện nút viền nét đứt "Thêm món". Thêm "Đã nấu"/"Bỏ món"
// vì ô thực đơn trên server có trạng thái hoàn thành và xóa được (báo cáo gap F04).
export function MealSlotSection({
  mealTitle,
  slot,
  onPressChange,
  onPressDetail,
  onToggleCompleted,
  onRemove,
  busy = false,
  className = '',
}: MealSlotSectionProps) {
  const { colors } = useTheme();

  return (
    <View className={`gap-sm ${className}`}>
      <AppText variant="bodyMedium" color="secondary">
        {mealTitle}
      </AppText>
      {slot ? (
        <View className="flex-row items-center gap-xs">
          <Pressable
            className="flex-1 flex-row items-center gap-sm"
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết ${slot.recipeName}`}
            onPress={onPressDetail}
          >
            <RecipeImage imageUrl={slot.imageUrl} iconSize={20} className="h-[56px] w-[56px] rounded-md" />
            <View className="flex-1 gap-xxs">
              <AppText
                variant="bodyLg"
                numberOfLines={1}
                color={slot.isCompleted ? 'muted' : 'primary'}
                className={slot.isCompleted ? 'line-through' : ''}
              >
                {slot.recipeName}
              </AppText>
              <AppText variant="caption" color="secondary">
                {`${slot.durationMinutes} phút · ${slot.calories} kcal${slot.isCompleted ? ' · Đã nấu' : ''}`}
              </AppText>
            </View>
          </Pressable>
          {onToggleCompleted ? (
            <AppIconButton
              accessibilityLabel={slot.isCompleted ? `Bỏ đánh dấu đã nấu ${slot.recipeName}` : `Đánh dấu đã nấu ${slot.recipeName}`}
              accessibilityState={{ checked: slot.isCompleted, busy }}
              disabled={busy}
              icon={
                slot.isCompleted ? (
                  <CheckCircle2 size={20} color={colors.primary} />
                ) : (
                  <Circle size={20} color={colors.textSecondary} />
                )
              }
              onPress={onToggleCompleted}
            />
          ) : null}
          <AppIconButton
            accessibilityLabel={`Đổi món ${slot.recipeName}`}
            disabled={busy}
            icon={<ArrowLeftRight size={20} color={colors.textSecondary} />}
            onPress={onPressChange}
          />
          {onRemove ? (
            <AppIconButton
              accessibilityLabel={`Bỏ ${slot.recipeName} khỏi ${mealTitle}`}
              disabled={busy}
              icon={<Trash2 size={20} color={colors.textSecondary} />}
              onPress={onRemove}
            />
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Thêm món cho ${mealTitle}`}
          onPress={onPressChange}
          className="h-[48px] flex-row items-center justify-center gap-xs rounded-md border border-dashed border-border"
        >
          <Plus size={18} color={colors.primary} />
          <AppText variant="bodyMedium" color="primary">
            Thêm món
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
