import { AlertTriangle, Pencil, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { AppIconButton, AppInput, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { AIRecognizedItem } from '../types/ai.types';

export interface AiResultItemRowProps {
  item: AIRecognizedItem;
  onChangeGrams: (grams: number) => void;
  onDelete: () => void;
  className?: string;
}

// design/AISnap.dc.html, design/VoiceLog.dc.html — row món AI nhận diện, cho phép Sửa/Xóa
// trước khi Confirm (BR-054, design.md mục 27: user phải sửa được Food/Quantity/Serving).
export function AiResultItemRow({
  item,
  onChangeGrams,
  onDelete,
  className = '',
}: AiResultItemRowProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [draftGrams, setDraftGrams] = useState(String(item.grams));

  const commitEdit = () => {
    const parsed = Number(draftGrams);
    if (Number.isFinite(parsed) && parsed > 0) {
      onChangeGrams(Math.round(parsed));
    } else {
      setDraftGrams(String(item.grams));
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View className={`flex-row items-end gap-sm border-t border-border py-sm ${className}`}>
        <AppInput
          label={item.name}
          value={draftGrams}
          onChangeText={setDraftGrams}
          keyboardType="number-pad"
          rightAdornment={
            <AppText variant="body" color="secondary">
              g
            </AppText>
          }
          className="flex-1"
        />
        <AppIconButton
          accessibilityLabel={`Xong sửa ${item.name}`}
          variant="soft"
          icon={<Pencil size={20} color={colors.primary} />}
          onPress={commitEdit}
        />
      </View>
    );
  }

  return (
    <View className={`flex-row items-center gap-sm border-t border-border py-sm ${className}`}>
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyLg">{item.name}</AppText>
        <AppText variant="body" color="secondary">
          {`${item.servingLabel} · ≈ ${item.nutrition.calories} kcal`}
        </AppText>
        {item.isUncertain ? (
          <View className="flex-row items-center gap-xxs">
            <AlertTriangle size={14} color={colors.warning} />
            <AppText variant="caption" className="font-sans-semibold text-warning-text">
              Chưa chắc chắn · kiểm tra lại
            </AppText>
          </View>
        ) : null}
      </View>
      <AppIconButton
        accessibilityLabel={`Sửa ${item.name}`}
        variant="soft"
        icon={<Pencil size={20} color={colors.primary} />}
        onPress={() => {
          setDraftGrams(String(item.grams));
          setIsEditing(true);
        }}
      />
      <AppIconButton
        accessibilityLabel={`Xóa ${item.name}`}
        icon={<Trash2 size={20} color={colors.textSecondary} />}
        onPress={onDelete}
      />
    </View>
  );
}
