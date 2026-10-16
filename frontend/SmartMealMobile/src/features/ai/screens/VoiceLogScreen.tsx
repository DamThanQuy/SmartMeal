import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { HelpCircle, Mic, Pause, Play, Volume2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import { AiDemoNotice } from '../components/AiResultNotices';
import { AiResultItemRow } from '../components/AiResultItemRow';
import { useTranscribeVoice } from '../hooks/useAiAnalysis';
import { useAiQuota, useRefreshAiQuota } from '../hooks/useAiQuota';
import { AiRecognitionFailedError, isAiQuotaExceededError } from '../services/aiService';
import type { AIRecognizedItem, VoiceLogResult } from '../types/ai.types';

type Props = NativeStackScreenProps<MainStackParamList, 'VoiceLog'>;

type Phase = 'recording' | 'processing' | 'reviewing';

const DEFAULT_WAVEFORMS = [12, 20, 28, 16, 36, 24, 14, 28, 38, 22, 16, 26, 12];

// Bật metering để sóng âm chạy theo cường độ giọng nói thật.
const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const RECORDER_STATUS_INTERVAL_MS = 100;

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
  const refreshQuota = useRefreshAiQuota();
  const transcribeVoice = useTranscribeVoice();
  const addMealLogEntries = useAddMealLogEntries(todayIso());

  const [phase, setPhase] = useState<Phase>(initialResult ? 'reviewing' : 'recording');
  const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(initialResult ?? null);
  const [items, setItems] = useState<AIRecognizedItem[]>(initialResult?.items ?? []);
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(
    initialResult ? resolvePortionIdFor(initialResult) : null,
  );

  // Trạng thái ghi âm thật qua expo-audio (expo-av không còn trong Expo Go SDK 57)
  const [durationMillis, setDurationMillis] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(DEFAULT_WAVEFORMS);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const player = useAudioPlayer(recordedUri);
  const playerStatus = useAudioPlayerStatus(player);
  const isPlayingAudio = playerStatus.playing;

  // Cập nhật thời lượng + sóng âm theo trạng thái recorder trong lúc đang ghi.
  useEffect(() => {
    const timer = setInterval(() => {
      const status = recorder.getStatus();
      if (!status.isRecording) return;
      setDurationMillis(status.durationMillis);
      if (typeof status.metering === 'number') {
        // Cường độ âm thanh dBFS từ -160 đến 0
        const normalized = Math.min(Math.max((status.metering + 60) / 60, 0.15), 1);
        setWaveHeights(prev => prev.map(() => Math.round(10 + Math.random() * normalized * 32)));
      }
    }, RECORDER_STATUS_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [recorder]);

  // Bắt đầu ghi âm thật
  const startRecording = async () => {
    try {
      const { granted } = await getRecordingPermissionsAsync();
      if (!granted) {
        navigation.replace(MAIN_STACK_ROUTES.VOICE_PERMISSION, { mealType });
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      // Nếu có lỗi khởi tạo ghi âm (ví dụ chạy trên simulator không có mic)
    }
  };

  // Tự động kích hoạt ghi âm khi vào màn hình (nếu không có initialResult)
  useEffect(() => {
    if (!initialResult) {
      void startRecording();
    }

    return () => {
      // Dọn dẹp an toàn khi rời màn hình; recorder/player do hook expo-audio tự giải phóng.
      try {
        if (recorder.isRecording) void recorder.stop().catch(() => {});
      } catch {
        // Recorder có thể đã được giải phóng trước.
      }
      void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dừng ghi âm và gửi xử lý AI
  const stopAndTranscribe = async () => {
    let audioUri: string | null = null;
    try {
      if (recorder.isRecording) {
        await recorder.stop();
        audioUri = recorder.uri;
        setRecordedUri(audioUri);
        await setAudioModeAsync({ allowsRecording: false });
      }
    } catch {
      // Bỏ qua lỗi dừng ghi âm
    }

    setPhase('processing');
    transcribeVoice.mutate(
      { mealType, audioUri: audioUri ?? undefined },
      {
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
            return;
          }
          if (isAiQuotaExceededError(error)) {
            refreshQuota();
            navigation.replace(MAIN_STACK_ROUTES.STATE_AI_LIMIT, { mealType });
            return;
          }
          // Vd. không thu được ghi âm, lỗi mạng: báo rõ lý do thay vì treo ở "Đang nhận diện…".
          navigation.replace(MAIN_STACK_ROUTES.STATE_AI_FAILED, {
            mealType,
            source: 'voice',
            message: error.message,
          });
        },
      },
    );
  };

  // Nghe lại đoạn âm thanh vừa thu
  const togglePlayRecordedAudio = async () => {
    if (!recordedUri) return;

    try {
      if (isPlayingAudio) {
        player.pause();
        return;
      }
      // Nghe hết rồi thì phát lại từ đầu.
      if (playerStatus.didJustFinish || (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration)) {
        await player.seekTo(0);
      }
      player.play();
    } catch {
      // Bỏ qua lỗi phát lại
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
    if (isPlayingAudio) player.pause();
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
          logMethod: 'Voice',
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
            {voiceResult.isDemo ? <AiDemoNotice /> : null}
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
