import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image as ImageIcon, RefreshCw, X, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useAiQuota } from '../hooks/useAiQuota';

type Props = NativeStackScreenProps<MainStackParamList, 'AICamera'>;

// design/AICamera.dc.html (BR-060). Nhánh feat/mock-ui: chưa gọi expo-camera thật — preview là
// nền tĩnh, nút chụp điều hướng thẳng sang AIAnalyzing (CLAUDE.md mục 8).
//
// Camera viewfinder luôn tối bất kể theme sáng/tối (giống camera app thật) — dùng token
// `overlay`/`onPrimary` (bất biến theo theme, xem src/theme/tokens.js) thay vì `text-primary`/
// `text-inverse` (đổi theo theme, sẽ làm màn này bị lật màu ở dark mode).
export function AICameraScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const { remaining, limit } = useAiQuota();

  return (
    <View className="flex-1 bg-overlay">
      <View className="flex-row items-center justify-between px-md pt-[52px]">
        <AppIconButton
          accessibilityLabel="Đóng"
          icon={<X size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="bodyMedium" className="text-on-primary">
          Chụp món ăn
        </AppText>
        {/* Flash — chưa bật thật, chỉ hiện UI theo CLAUDE.md mục 8. */}
        <AppIconButton
          accessibilityLabel="Đèn flash"
          icon={<Zap size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          disabled
        />
      </View>

      <View className="flex-1 items-center justify-center gap-md">
        <View className="h-[300px] w-[300px] rounded-full border-2 border-dashed border-on-primary/70" />
        <AppText variant="body" className="text-on-primary">
          Đặt đĩa ăn vào khung · chụp từ trên xuống
        </AppText>
        <AppText variant="caption" className="text-on-primary opacity-80">
          {`Còn ${remaining}/${limit} lượt AI hôm nay`}
        </AppText>
      </View>

      <View className="flex-row items-center justify-around px-md pb-[48px] pt-lg">
        <AppIconButton
          accessibilityLabel="Chọn từ thư viện ảnh"
          icon={<ImageIcon size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          disabled
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chụp"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.AI_ANALYZING, { mealType })}
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-primary"
        >
          <View className="h-[60px] w-[60px] rounded-full bg-on-primary" />
        </Pressable>
        <AppIconButton
          accessibilityLabel="Đổi camera"
          icon={<RefreshCw size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          disabled
        />
      </View>
    </View>
  );
}
