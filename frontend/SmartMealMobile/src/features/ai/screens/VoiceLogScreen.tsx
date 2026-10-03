import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { HelpCircle, Mic, Pause, Play, Volume2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppChip, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import {
  nutritionPerGram as toNutritionPerGram,
  scaleNutritionByGrams,
  todayIso,
  useAddMealLogEntries,
} from '@/features/nutrition';
import { AiResultItemRow } from '../components/AiResultItemRow';
import { useTranscribeVoice } from '../hooks/useAiAnalysis';
import { useAiQuota } from '../hooks/useAiQuota';
import { AiRecognitionFailedError } from '../services/aiService';
import type { AIRecognizedItem, VoiceLogResult } from '../types/ai.types';

type Props = NativeStackScreenProps<MainStackParamList, 'VoiceLog'>;

type Phase = 'recording' | 'processing' | 'reviewing';

const DEFAULT_WAVEFORMS = [12, 20, 28, 16, 36, 24, 14, 28, 38, 22, 16, 26, 12];

function resolvePortionIdFor(result: VoiceLogResult): string | null {
  return (
    result.portionQuestion?.options.find(
      option =>
        option.grams === result.items.find(item => item.id === result.portionQuestion?.itemId)?.grams,
    )?.id ?? null
  );
}

function formatDuration(durationMillis: number): string {
  const totalSeconds = Math.floor(durationMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

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

  // Trạng thái ghi âm thật qua expo-av
  const [durationMillis, setDurationMillis] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(DEFAULT_WAVEFORMS);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Bắt đầu ghi âm thật
  const startRecording = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        navigation.replace(MAIN_STACK_ROUTES.VOICE_PERMISSION, { mealType });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (statusUpdate: Audio.RecordingStatus) => {
          if (statusUpdate.isRecording) {
            setDurationMillis(statusUpdate.durationMillis);
            if (typeof statusUpdate.metering === 'number') {
              // Cường độ âm thanh dBFS từ -160 đến 0
              const normalized = Math.min(Math.max((statusUpdate.metering + 60) / 60, 0.15), 1);
              setWaveHeights(prev =>
                prev.map((_, i) => Math.round(10 + Math.random() * normalized * 32))
              );
            }
          }
        },
        100
      );

      recordingRef.current = recording;
    } catch {
      // Nếu có lỗi khởi tạo ghi âm (ví dụ chạy trên simulator không có mic)
    }
  };

  // Tự động kích hoạt ghi âm khi vào màn hình (nếu không có initialResult)
  useEffect(() => {
    let isMounted = true;
    if (!initialResult) {
      void startRecording();
    }

    return () => {
      isMounted = false;
      // Dọn dẹp an toàn khi rời màn hình
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      void Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dừng ghi âm và gửi xử lý AI
  const stopAndTranscribe = async () => {
    let audioUri: string | null = null;
    try {
      if (recordingRef.current) {
        const recording = recordingRef.current;
        recordingRef.current = null;
        await recording.stopAndUnloadAsync();
        audioUri = recording.getURI();
        setRecordedUri(audioUri);
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }
    } catch {
      // Bỏ qua lỗi dừng ghi âm
    }

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

  // Nghe lại đoạn âm thanh vừa thu
  const togglePlayRecordedAudio = async () => {
    if (!recordedUri) return;

    try {
      if (soundRef.current) {
        if (isPlayingAudio) {
          await soundRef.current.pauseAsync();
          setIsPlayingAudio(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlayingAudio(true);
        }
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true },
          status => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlayingAudio(false);
            }
          }
        );
        soundRef.current = sound;
        setIsPlayingAudio(true);
      }
    } catch {
      setIsPlayingAudio(false);
    }
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

  const handleRetry = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsPlayingAudio(false);
    }
    setDurationMillis(0);
    setRecordedUri(null);
    setWaveHeights(DEFAULT_WAVEFORMS);
    setPhase('recording');
    setVoiceResult(null);
    setItems([]);
    setSelectedPortionId(null);
    void startRecording();
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
          <View className="h-[120px] w-[120px] items-center justify-center rounded-full bg-primary-soft shadow-sm">
            <AppIconButton
              accessibilityLabel={phase === 'recording' ? 'Dừng ghi âm' : 'Đang xử lý ghi âm'}
              disabled={phase !== 'recording'}
              onPress={stopAndTranscribe}
              icon={
                phase === 'processing' ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Mic size={40} color={colors.onPrimary} />
                )
              }
              className="h-[96px] w-[96px] bg-primary active:scale-95"
            />
          </View>

          {/* Dải sóng âm thanh chuyển động theo giọng nói thật */}
          {phase !== 'reviewing' ? (
            <View
              className="h-[44px] flex-row items-center gap-xxs"
              importantForAccessibility="no-hide-descendants"
            >
              {waveHeights.map((height, index) => (
                <View
                  key={index}
                  className="w-[4px] rounded-pill bg-primary"
                  style={{ height: phase === 'recording' ? height : 10 }}
                />
              ))}
            </View>
          ) : null}

          <AppText variant="body" color="secondary" className="font-medium">
            {phase === 'recording'
              ? `Đang nghe… chạm để dừng (${formatDuration(durationMillis)})`
              : phase === 'processing'
                ? 'Đang nhận diện giọng nói…'
                : 'Đã ghi âm và nhận diện xong'}
          </AppText>
        </View>

        {voiceResult ? (
          <>
            {/* Thẻ hiển thị nội dung nhận diện kèm nút nghe lại file ghi âm */}
            <View className="rounded-card bg-primary-soft p-md gap-xs">
              <View className="flex-row items-center justify-between">
                <AppText variant="caption" color="secondary" className="font-semibold uppercase tracking-wider">
                  Nội dung nhận diện
                </AppText>
                {recordedUri ? (
                  <AppIconButton
                    accessibilityLabel={isPlayingAudio ? 'Tạm dừng nghe lại' : 'Nghe lại đoạn ghi âm'}
                    icon={isPlayingAudio ? <Pause size={18} color={colors.primary} /> : <Play size={18} color={colors.primary} />}
                    className="h-8 w-8 bg-surface rounded-full shadow-sm"
                    onPress={togglePlayRecordedAudio}
                  />
                ) : null}
              </View>
              <AppText variant="bodyLg">{`“${voiceResult.transcript}”`}</AppText>
            </View>

            <AppCard className="gap-0">
              <View className="flex-row items-center justify-between pb-sm">
                <AppText variant="h3">{MEAL_TYPE_TITLES[mealType]}</AppText>
                <AppBadge label="AI ước tính" tone="info" />
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
