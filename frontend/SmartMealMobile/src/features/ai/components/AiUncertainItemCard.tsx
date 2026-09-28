import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppChip, AppInput, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { AIRecognizedItem } from '../types/ai.types';

export const CUSTOM_CANDIDATE_ID = 'custom';

export interface AiUncertainItemCardProps {
  item: AIRecognizedItem;
  selectedCandidateId: string | null;
  customName: string;
  selectedPortionId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  onChangeCustomName: (name: string) => void;
  onSelectPortion: (portionId: string) => void;
  className?: string;
}

// design/AISnapUncertain.dc.html (BR-072, BR-054) — không tách route riêng, chỉ hiện khi
// AISnapResultScreen có món isUncertain: hỏi lại tên món đúng + khẩu phần trước khi tính vào
// Confirm. Radio row dùng lại đúng style vòng tròn của SlotOptionRow (meal-planner).
export function AiUncertainItemCard({
  item,
  selectedCandidateId,
  customName,
  selectedPortionId,
  onSelectCandidate,
  onChangeCustomName,
  onSelectPortion,
  className = '',
}: AiUncertainItemCardProps) {
  const { colors } = useTheme();
  const resolution = item.uncertainResolution;
  if (!resolution) return null;

  const isCustom = selectedCandidateId === CUSTOM_CANDIDATE_ID;

  return (
    <View
      accessibilityRole="alert"
      className={`gap-md rounded-card border border-warning bg-surface p-md ${className}`}
    >
      <View className="flex-row items-start gap-sm">
        <AlertTriangle size={22} color={colors.warning} />
        <View className="flex-1 gap-xxs">
          <AppText variant="bodyMedium">AI chưa chắc chắn về 1 món</AppText>
          <AppText variant="body" color="secondary">
            Chọn đúng món để tính calo chính xác hơn. Món này chưa được ghi.
          </AppText>
        </View>
      </View>

      <View className="gap-sm">
        {resolution.candidates.map(candidate => {
          const selected = selectedCandidateId === candidate.id;
          return (
            <Pressable
              key={candidate.id}
              accessibilityRole="radio"
              accessibilityLabel={candidate.name}
              accessibilityState={{ selected }}
              onPress={() => onSelectCandidate(candidate.id)}
              className={`min-h-[64px] flex-row items-center gap-sm rounded-card border p-md ${
                selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
              }`}
            >
              <View className="flex-1 gap-xxs">
                <AppText variant="bodyMedium">{candidate.name}</AppText>
                <AppText variant="caption" color="secondary">
                  {`Độ chắc chắn ≈ ${candidate.confidencePercent}%`}
                </AppText>
              </View>
              <View
                className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                  selected ? 'border-primary' : 'border-border'
                }`}
              >
                {selected ? <View className="h-[12px] w-[12px] rounded-full bg-primary" /> : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Không đúng, tự nhập tên món"
          onPress={() => onSelectCandidate(CUSTOM_CANDIDATE_ID)}
          className="min-h-[48px] items-center justify-center rounded-md border border-dashed border-border-strong"
        >
          <AppText variant="bodyMedium" color="primary">
            Không đúng, tự nhập tên món
          </AppText>
        </Pressable>
        {isCustom ? (
          <AppInput
            label="Tên món"
            placeholder="VD: Canh rau dền"
            value={customName}
            onChangeText={onChangeCustomName}
          />
        ) : null}
      </View>

      <View className="gap-sm">
        <AppText variant="bodyMedium">Khẩu phần</AppText>
        <View className="flex-row flex-wrap gap-xs">
          {resolution.portionOptions.map(option => (
            <AppChip
              key={option.id}
              label={option.label}
              selected={selectedPortionId === option.id}
              onPress={() => onSelectPortion(option.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
