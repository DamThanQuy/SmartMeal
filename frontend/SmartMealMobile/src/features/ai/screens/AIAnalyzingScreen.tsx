import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { AiRecognitionFailedError } from '../services/aiService';
import { useAnalyzeMealPhoto } from '../hooks/useAiAnalysis';
import { useAiQuota } from '../hooks/useAiQuota';

type Props = NativeStackScreenProps<MainStackParamList, 'AIAnalyzing'>;

interface StepRowProps {
  label: string;
  status: 'done' | 'active' | 'pending';
}

function StepRow({ label, status }: StepRowProps) {
  return (
    <View className="flex-row items-center gap-sm">
      {status === 'done' ? (
        <View className="h-[24px] w-[24px] items-center justify-center rounded-full bg-primary">
          <AppText variant="caption" className="text-on-primary">
            ✓
          </AppText>
        </View>
      ) : status === 'active' ? (
        <View className="h-[24px] w-[24px] rounded-full border-[3px] border-primary border-r-primary-soft" />
      ) : (
        <View className="h-[24px] w-[24px] rounded-full border-2 border-border" />
      )}
      <AppText
        variant={status === 'active' ? 'bodyMedium' : 'body'}
        color={status === 'pending' ? 'secondary' : 'primary'}
      >
        {label}
      </AppText>
    </View>
  );
}

// design/AIAnalyzing.dc.html (BR-060, BR-233). Gọi aiService.analyzeMealPhoto() ngay khi vào
// màn; thành công → AISnapResult, thất bại → StateAIFailed (không trừ quota — BR-233).
export function AIAnalyzingScreen({ navigation, route }: Props) {
  const { mealType, photoUri } = route.params;
  const { colors } = useTheme();
  const { consumeQuota } = useAiQuota();
  const analyzeMealPhoto = useAnalyzeMealPhoto();

  useEffect(() => {
    analyzeMealPhoto.mutate(mealType, {
      onSuccess: result => {
        consumeQuota();
        navigation.replace(MAIN_STACK_ROUTES.AI_SNAP_RESULT, { mealType, result });
      },
      onError: error => {
        if (error instanceof AiRecognitionFailedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_AI_FAILED, { mealType, source: 'photo' });
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenContainer>
      <ScreenHeader title="Đang phân tích" onBack={() => navigation.goBack()} />
      <View className="flex-1 gap-xl py-xs">
        {photoUri ? (
          <View className="h-[260px] w-full overflow-hidden rounded-lg bg-primary-soft border border-border">
            <Image
              source={{ uri: photoUri }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>
        ) : (
          <View className="h-[260px] items-center justify-center gap-xxs rounded-lg bg-primary-soft">
            <Search size={40} color={colors.primary} />
            <AppText variant="caption" className="text-on-primary-soft">
              Ảnh vừa chụp
            </AppText>
          </View>
        )}

        <View className="items-center gap-sm">
          <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-primary-soft">
            <Search size={26} color={colors.primary} />
          </View>
          <AppText variant="h2" className="text-center">
            Đang nhận diện món ăn…
          </AppText>
          <AppText variant="body" color="secondary">
            Có thể mất vài giây.
          </AppText>
        </View>

        <View className="gap-xxs">
          <View className="h-[10px] overflow-hidden rounded-pill bg-primary-soft">
            <View className="h-[10px] w-[70%] rounded-pill bg-primary" />
          </View>
          <AppText variant="caption" color="secondary" className="text-right">
            Đang phân tích hình ảnh
          </AppText>
        </View>

        <AppCard className="gap-sm">
          <StepRow label="Tải ảnh lên" status="done" />
          <StepRow label="Nhận diện món ăn" status="done" />
          <StepRow label="Ước tính khẩu phần" status="active" />
          <StepRow label="Tính dinh dưỡng" status="pending" />
        </AppCard>

        <View className="flex-1" />
        <AppButton
          label="Hủy"
          variant="outline"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
        />
      </View>
    </ScreenContainer>
  );
}
