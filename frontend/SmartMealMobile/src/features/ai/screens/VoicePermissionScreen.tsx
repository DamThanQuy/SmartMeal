import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MicOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppInput, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useAiQuota } from '../hooks/useAiQuota';
import { useTranscribeVoice } from '../hooks/useAiAnalysis';
import { AiRecognitionFailedError } from '../services/aiService';
import { useAiQuotaStore } from '../state/aiQuotaStore';

type Props = NativeStackScreenProps<MainStackParamList, 'VoicePermission'>;

// design/VoicePermission.dc.html (BR-252). Nhánh feat/mock-ui mô phỏng "chưa cấp quyền micro"
// mỗi khi vào luồng Voice Logging lần đầu trong phiên — không gọi expo-av thật. "Hoặc gõ bữa ăn
// của bạn" vẫn đi qua đúng aiService + bước Review như VoiceLog (không tự lưu, BR-054).
export function VoicePermissionScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const grantMicPermission = useAiQuotaStore(state => state.grantMicPermission);
  const { consumeQuota } = useAiQuota();
  const transcribeVoice = useTranscribeVoice();
  const [manualText, setManualText] = useState('');

  const handleAllowMic = () => {
    grantMicPermission();
    navigation.replace(MAIN_STACK_ROUTES.VOICE_LOG, { mealType });
  };

  const handleAnalyzeText = () => {
    if (!manualText.trim()) return;
    transcribeVoice.mutate(mealType, {
      onSuccess: result => {
        consumeQuota();
        navigation.replace(MAIN_STACK_ROUTES.VOICE_LOG, { mealType, initialResult: result });
      },
      onError: error => {
        if (error instanceof AiRecognitionFailedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_AI_FAILED, { mealType, source: 'voice' });
        }
      },
    });
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Nói để ghi" onBack={() => navigation.goBack()} />
      <View className="flex-1 gap-xl py-xs">
        <View className="flex-1 items-center justify-center gap-sm px-lg">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
            <MicOff size={34} color={colors.primary} />
          </View>
          <AppText variant="h2" className="text-center">
            SmartMeal cần quyền dùng micro
          </AppText>
          <AppText variant="body" color="secondary" className="text-center">
            Micro dùng để ghi lại mô tả bữa ăn của bạn. Bạn có thể bật lại trong cài đặt máy bất cứ
            lúc nào.
          </AppText>
          <View className="mt-sm w-full gap-sm">
            <AppButton label="Cho phép micro" onPress={handleAllowMic} />
            <AppButton label="Mở cài đặt máy" variant="outline" onPress={() => Linking.openSettings()} />
          </View>
        </View>

        <AppCard className="gap-sm">
          <AppText variant="h3">Hoặc gõ bữa ăn của bạn</AppText>
          <AppInput
            placeholder="VD: Sáng nay tôi ăn một tô bún bò và uống một ly nước cam"
            value={manualText}
            onChangeText={setManualText}
            multiline
            numberOfLines={4}
            className="h-[88px] py-sm"
          />
          {transcribeVoice.isError ? (
            <AppText variant="caption" color="error">
              Không thể phân tích, vui lòng thử lại.
            </AppText>
          ) : null}
          <AppButton
            label="Phân tích"
            variant="secondary"
            onPress={handleAnalyzeText}
            loading={transcribeVoice.isPending}
            disabled={!manualText.trim()}
          />
        </AppCard>
      </View>
    </ScreenContainer>
  );
}
