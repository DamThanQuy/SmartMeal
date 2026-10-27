import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { HelpCircle, Mic, Pause, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { MealTypeChips, ScreenContainer, ScreenHeader } from '@/components/common';
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
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AiRecognitionFailedError, isAiQuotaExceededError } from '../services/aiService';
import type { AIRecognizedItem, VoiceLogResult } from '../types/ai.types';

type Props = NativeStackScreenProps<MainStackParamList, 'VoiceLog'>;

type Phase = 'recording' | 'processing' | 'reviewing';

/** Chiều cao thanh sóng âm (px) khi im lặng và khi to nhất. */
const WAVE_MIN_HEIGHT = 8;
const WAVE_MAX_HEIGHT = 44;

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

// design/VoiceLog.dc.html (BR-070, BR-054). Vào màn là bắt đầu nghe (useVoiceRecorder — luồng PCM của
// expo-audio); trong lúc nói, phụ đề tạm hiện ngay dưới micro. Chạm micro để dừng → gửi file WAV lên
// /ai/voice-log/audio → duyệt món → xác nhận mới ghi nhật ký. Micro lỗi thì báo ngay tại chỗ và chạm để thử lại.
export function VoiceLogScreen({ navigation, route }: Props) {
  const { mealType: initialMealType, initialResult } = route.params;
  // Bữa mặc định theo nơi mở màn; người dùng đổi được trước khi lưu (BR-051, BR-054).
  const [mealType, setMealType] = useState(initialMealType);
  const { colors } = useTheme();
  const { consumeQuota } = useAiQuota();
  const refreshQuota = useRefreshAiQuota();
  const transcribeVoice = useTranscribeVoice();
  const addMealLogEntries = useAddMealLogEntries(todayIso());
  // Nói tới giới hạn thời lượng thì tự dừng và phân tích.
  const recorder = useVoiceRecorder({ onMaxDuration: () => void stopAndTranscribe() });

  const [phase, setPhase] = useState<Phase>(initialResult ? 'reviewing' : 'recording');
  const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(initialResult ?? null);
  const [items, setItems] = useState<AIRecognizedItem[]>(initialResult?.items ?? []);
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(
    initialResult ? resolvePortionIdFor(initialResult) : null,
  );
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  const player = useAudioPlayer(recordedUri);
  const playerStatus = useAudioPlayerStatus(player);
  const isPlayingAudio = playerStatus.playing;

  const isListening = phase === 'recording' && recorder.status === 'recording';
  const isStarting = phase === 'recording' && recorder.status === 'starting';

  const startRecording = async () => {
    const outcome = await recorder.start();
    if (outcome === 'permission-denied') {
      navigation.replace(MAIN_STACK_ROUTES.VOICE_PERMISSION, { mealType });
    }
  };

  // Tự bắt đầu nghe khi vào màn hình (trừ khi đã có kết quả từ VoicePermission "gõ bữa ăn").
  useEffect(() => {
    if (!initialResult) void startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dừng ghi và gửi phân tích; chưa thu được gì thì ở lại màn với lỗi + chạm micro để thử lại.
  const stopAndTranscribe = async () => {
    const recording = await recorder.stop();
    if (!recording) return;

    setRecordedUri(recording.uri);
    setPhase('processing');
    transcribeVoice.mutate(
      { mealType, audioUri: recording.uri },
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
          // Vd. lỗi mạng, AI đang lỗi: báo rõ lý do thay vì treo ở "Đang phân tích…".
          navigation.replace(MAIN_STACK_ROUTES.STATE_AI_FAILED, {
            mealType,
            source: 'voice',
            message: error.message,
          });
        },
      },
    );
  };

  const handleMicPress = () => {
    if (isListening) {
      void stopAndTranscribe();
      return;
    }
    // Lỗi micro / chưa thu được gì: chạm để nghe lại.
    void startRecording();
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

  const handleRetry = () => {
    if (isPlayingAudio) player.pause();
    setRecordedUri(null);
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

  const statusText =
    phase === 'processing'
      ? 'Đang phân tích bữa ăn…'
      : phase === 'reviewing'
        ? 'Đã ghi âm và nhận diện xong'
        : isStarting
          ? 'Đang mở micro…'
          : isListening
            ? `Đang nghe… chạm để dừng (${formatDuration(recorder.durationMillis)})`
            : 'Chạm micro để bắt đầu nói';

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
              accessibilityLabel={isListening ? 'Dừng ghi âm' : phase === 'recording' ? 'Bắt đầu ghi âm' : 'Đang xử lý ghi âm'}
              disabled={phase !== 'recording' || isStarting}
              onPress={handleMicPress}
              icon={
                phase === 'processing' || isStarting ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Mic size={40} color={colors.onPrimary} />
                )
              }
              className="h-[96px] w-[96px] bg-primary active:scale-95"
            />
          </View>

          {/* Dải sóng âm chạy theo âm lượng giọng nói thật (mới nhất ở bên phải) */}
          {phase !== 'reviewing' ? (
            <View
              className="h-[44px] flex-row items-center gap-xxs"
              importantForAccessibility="no-hide-descendants"
            >
              {recorder.levels.map((level, index) => (
                <View
                  key={index}
                  className="w-[4px] rounded-pill bg-primary"
                  style={{
                    height: isListening
                      ? WAVE_MIN_HEIGHT + level * (WAVE_MAX_HEIGHT - WAVE_MIN_HEIGHT)
                      : WAVE_MIN_HEIGHT,
                  }}
                />
              ))}
            </View>
          ) : null}

          <AppText variant="body" color="secondary" className="font-medium">
            {statusText}
          </AppText>

          {phase === 'recording' && recorder.error ? (
            <AppText variant="caption" color="error" className="text-center">
              {recorder.error}
            </AppText>
          ) : null}

          {/* Phụ đề tạm: lời người dùng đang nói, cập nhật vài giây một lần */}
          {phase !== 'reviewing' ? (
            <View
              accessibilityLiveRegion="polite"
              className="min-h-[72px] w-full justify-center rounded-card bg-surface p-md"
            >
              {recorder.liveTranscript ? (
                <AppText variant="bodyLg" className="text-center">
                  {`“${recorder.liveTranscript}”`}
                </AppText>
              ) : (
                <AppText variant="body" color="secondary" className="text-center">
                  {isListening
                    ? 'Hãy nói món bạn đã ăn, ví dụ: “Trưa nay tôi ăn một tô phở bò”'
                    : 'Lời bạn nói sẽ hiện ở đây.'}
                </AppText>
              )}
            </View>
          ) : null}
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

            <View className="gap-xs">
              <AppText variant="bodyMedium">Ghi vào bữa</AppText>
              <MealTypeChips value={mealType} onChange={setMealType} />
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
