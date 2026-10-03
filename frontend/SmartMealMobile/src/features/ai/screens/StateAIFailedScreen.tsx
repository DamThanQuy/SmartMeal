import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'StateAIFailed'>;

// design/StateAIFailed.dc.html (BR-233 — lượt AI không bị trừ khi thất bại). Dùng chung cho cả
// AI Snap và Voice Logging thất bại, đổi CTA chính theo `route.params.source`.
export function StateAIFailedScreen({ navigation, route }: Props) {
  const { mealType, source, message } = route.params;
  const { colors } = useTheme();

  const retryAction =
    source === 'photo'
      ? { label: 'Chụp lại', onPress: () => navigation.replace(MAIN_STACK_ROUTES.AI_CAMERA, { mealType }) }
      : { label: 'Nói lại', onPress: () => navigation.replace(MAIN_STACK_ROUTES.VOICE_LOG, { mealType }) };

  const alternateAction =
    source === 'photo'
      ? { label: 'Nói để ghi', onPress: () => navigation.replace(MAIN_STACK_ROUTES.VOICE_LOG, { mealType }) }
      : { label: 'Chụp món ăn', onPress: () => navigation.replace(MAIN_STACK_ROUTES.AI_CAMERA, { mealType }) };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={source === 'photo' ? 'Chụp món ăn' : 'Nói để ghi'}
        onBack={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
      />
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-warning-soft">
          <AlertTriangle size={34} color={colors.warningText} />
        </View>
        <AppText variant="h1" className="text-center">
          {message ? 'Chưa dùng được AI lúc này' : 'Chưa nhận diện được món ăn'}
        </AppText>
        {/* `message` là lý do cụ thể do máy chủ/ứng dụng báo (mất mạng, AI chưa cấu hình, ảnh không hợp lệ…). */}
        <AppText variant="body" color="secondary" className="text-center">
          {message
            ? `${message} Bạn vẫn có thể ghi món thủ công ngay bây giờ.`
            : source === 'photo'
              ? 'Ảnh có thể bị tối hoặc mờ. Bạn có thể chụp lại, hoặc ghi món thủ công ngay bây giờ.'
              : 'Có thể do môi trường ồn hoặc câu nói chưa rõ. Bạn có thể nói lại, hoặc ghi món thủ công ngay bây giờ.'}
          {'\nLượt AI này không bị trừ.'}
        </AppText>

        <View className="mt-sm w-full gap-sm">
          <AppButton
            label={retryAction.label}
            onPress={retryAction.onPress}
          />
          <AppButton
            label="Tìm món thủ công"
            variant="outline"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.FOOD_SEARCH, { mealType })}
          />
          <AppButton label={alternateAction.label} variant="text" onPress={alternateAction.onPress} />
        </View>
      </View>
    </ScreenContainer>
  );
}
