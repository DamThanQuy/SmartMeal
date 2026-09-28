import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HelpCircle, Mic } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppChip, AppIconButton, AppText } from '@/components/ui';
import {
  scaleNutritionByGrams,
  nutritionPerGram as toNutritionPerGram,
  todayIso,
  useAddMealLogEntries,
} from '@/features/nutrition';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { AiResultItemRow } from '../components/AiResultItemRow';
import { useAiQuota } from '../hooks/useAiQuota';
import { useTranscribeVoice } from '../hooks/useAiAnalysis';
import { AiRecognitionFailedError } from '../services/aiService';
import type { AIRecognizedItem, VoiceLogResult } from '../types/ai.types';

type Props = NativeStackScreenProps<MainStackParamList, 'VoiceLog'>;

type Phase = 'recording' | 'processing' | 'reviewing';

const WAVEFORM_HEIGHTS = [10, 18, 28, 16, 34, 22, 12, 26, 36, 20, 14, 24, 10];

function resolvePortionIdFor(result: VoiceLogResult): string | null {
  return (
    result.portionQuestion?.options.find(
      option =>
        option.grams === result.items.find(item => item.id === result.portionQuestion?.itemId)?.grams,
    )?.id ?? null
  );
}

// design/VoiceLog.dc.html (BR-070). Ghi âm thật (expo-av) chưa nối ở Đợt 2 — nút mic chỉ mô
// phỏng "dừng ghi âm" rồi gọi thẳng aiService.transcribeVoice() (CLAUDE.md mục 8).
//
// `route.params.initialResult` — đến từ VoicePermissionScreen "Hoặc gõ bữa ăn của bạn" (BR-252):
// bỏ qua bước ghi âm/mic, vào thẳng phase 'reviewing' với kết quả aiService đã trả sẵn.
export function VoiceLogScreen({ navigation, route }: Props) {
  const { mealType, initialResult } = route.params;
  const { colors } = useTheme();
  const { consumeQuota } = useAiQuota();
  const transcribeVoice = useTranscribeVoice();
  const addMealLogEntries = useAddMealLogEntries(todayIso());

  const [phase, setPhase] = useState<Phase>(initialResult ? 'reviewing' : 'recording');
  const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(initialResult ?? null);
  const [items, setItems] = useState<AIRecognizedItem[]>(initialResult?.items ?? []);
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(
    initialResult ? resolvePortionIdFor(initialResult) : null,
  );

  const startTranscribe = () => {
    setPhase('processing');
    transcribeVoice.mutate(mealType, {
      onSuccess: result => {
        consumeQuota();
        setVoiceResult(result);
        setItems(result.items);
        setSelectedPortionId(resolvePortionIdFor(result));
        setPhase('reviewing');
      },
      onError: error => {
        if (error instanceof AiRecognitionFailedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_AI_FAILED, { mealType, source: 'voice' });
        }
      },
    });
  };

  const updateItemGrams = (itemId: string, grams: number) => {
    setItems(current =>
      current.map(item => {
        if (item.id !== itemId) return item;
        const perGram = toNutritionPerGram(item.nutrition, item.grams);
        return { ...item, grams, nutrition: scaleNutritionByGrams(perGram, grams) };
      }),
    );
  };

  const removeItem = (itemId: string) => setItems(current => current.filter(item => item.id !== itemId));

  const handleSelectPortion = (optionId: string, grams: number) => {
    setSelectedPortionId(optionId);
    if (voiceResult?.portionQuestion) {
      updateItemGrams(voiceResult.portionQuestion.itemId, grams);
    }
  };

  const handleRetry = () => {
    setPhase('recording');
    setVoiceResult(null);
    setItems([]);
    setSelectedPortionId(null);
  };

  const handleConfirm = () => {
    addMealLogEntries.mutate(
      {
        mealType,
        entries: items.map(item => ({
          foodName: item.name,
          servingLabel: item.servingLabel,
          grams: item.grams,
          nutrition: item.nutrition,
          source: 'ai',
          aiConfirmed: true,
        })),
      },
      {
        onSuccess: () => {
          navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
            screen: MAIN_TAB_ROUTES.DIARY,
            params: { toast: `Đã ghi ${items.length} món vào ${MEAL_TYPE_TITLES[mealType]}` },
          });
        },
      },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Nói để ghi" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-xs"
      >
        <View className="items-center gap-sm py-xs">
          <View className="h-[120px] w-[120px] items-center justify-center rounded-full bg-primary-soft">
            <AppIconButton
              accessibilityLabel={phase === 'recording' ? 'Dừng ghi âm' : 'Đang xử lý ghi âm'}
              disabled={phase !== 'recording'}
              onPress={startTranscribe}
              icon={
                phase === 'processing' ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Mic size={40} color={colors.onPrimary} />
                )
              }
              className="h-[96px] w-[96px] bg-primary"
            />
          </View>
          {phase !== 'reviewing' ? (
            <View
              className="h-[40px] flex-row items-center gap-xxs"
              importantForAccessibility="no-hide-descendants"
            >
              {WAVEFORM_HEIGHTS.map((height, index) => (
                <View
                  key={index}
                  className="w-[4px] rounded-pill bg-primary"
                  style={{ height }}
                />
              ))}
            </View>
          ) : null}
          <AppText variant="body" color="secondary">
            {phase === 'recording'
              ? 'Đang nghe… chạm để dừng'
              : phase === 'processing'
                ? 'Đang xử lý ghi âm…'
                : 'Đã ghi âm xong'}
          </AppText>
        </View>

        {voiceResult ? (
          <>
            <View className="rounded-card bg-primary-soft p-md">
              <AppText variant="bodyLg">{`“${voiceResult.transcript}”`}</AppText>
            </View>

            <AppCard className="gap-0">
              <View className="flex-row items-center justify-between pb-sm">
                <AppText variant="h3">{MEAL_TYPE_TITLES[mealType]}</AppText>
                <AppBadge label="Ước tính" tone="info" />
              </View>
              {items.map(item => (
                <AiResultItemRow
                  key={item.id}
                  item={item}
                  onChangeGrams={grams => updateItemGrams(item.id, grams)}
                  onDelete={() => removeItem(item.id)}
                />
              ))}
            </AppCard>

            {voiceResult.portionQuestion ? (
              <View className="gap-sm rounded-card border border-warning bg-surface p-md">
                <View className="flex-row items-start gap-sm">
                  <HelpCircle size={22} color={colors.warning} />
                  <View className="flex-1 gap-xxs">
                    <AppText variant="bodyMedium">{voiceResult.portionQuestion.question}</AppText>
                    <AppText variant="body" color="secondary">
                      {voiceResult.portionQuestion.description}
                    </AppText>
                  </View>
                </View>
                <View className="flex-row gap-xs">
                  {voiceResult.portionQuestion.options.map(option => (
                    <AppChip
                      key={option.id}
                      label={option.label}
                      selected={selectedPortionId === option.id}
                      onPress={() => handleSelectPortion(option.id, option.grams)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {addMealLogEntries.isError ? (
              <AppText variant="caption" color="error" className="text-center">
                {addMealLogEntries.error.message}
              </AppText>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {voiceResult ? (
        <View className="flex-row gap-sm py-md">
          <AppButton
            label="Nói lại"
            variant="secondary"
            onPress={handleRetry}
            className="flex-shrink"
          />
          <AppButton
            label="Xác nhận & ghi"
            onPress={handleConfirm}
            loading={addMealLogEntries.isPending}
            disabled={items.length === 0}
            className="flex-1"
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
