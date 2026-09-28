import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Image as ImageIcon, X, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppChip, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'OCRCamera'>;

const TIPS = ['Chụp thẳng', 'Đủ sáng', 'Giữ chắc tay'];

// design/OCRCamera.dc.html (BR-130→132). Đích mới cho ProductNotFound "Quét nhãn dinh dưỡng"
// (trước trỏ thẳng OCRReview). Tab "Mã vạch" quay lại BarcodeScreen (trạng thái Đợt 4 giữ
// nguyên). Nhánh feat/mock-ui: chưa gọi expo-camera thật — nút chụp điều hướng thẳng OCRReview.
export function OCRCameraScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();

  return (
    <View className="flex-1 bg-overlay">
      <View className="flex-row items-center justify-between px-md pt-[52px]">
        <AppIconButton
          accessibilityLabel="Đóng"
          icon={<X size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
        />
        <AppText variant="bodyMedium" className="text-on-primary">
          Quét sản phẩm
        </AppText>
        <View className="h-[44px] w-[44px]" />
      </View>

      <View className="flex-row justify-center gap-xs pt-md">
        <AppChip
          label="Mã vạch"
          onPress={() => navigation.replace(MAIN_STACK_ROUTES.BARCODE, { mealType })}
        />
        <AppChip label="Nhãn dinh dưỡng" selected onPress={() => {}} />
      </View>

      <View className="flex-1 items-center justify-center gap-md px-lg">
        <View className="h-[240px] w-[300px] items-start rounded-lg border-2 border-dashed border-on-primary/80 p-sm">
          <AppText variant="caption" className="rounded-pill bg-on-primary/15 px-sm py-xxs text-on-primary">
            Nutrition Facts
          </AppText>
        </View>
        <AppText variant="body" className="text-center text-on-primary">
          Đặt bảng thành phần dinh dưỡng vào khung
        </AppText>
        <View className="flex-row gap-md">
          {TIPS.map(tip => (
            <View key={tip} className="flex-row items-center gap-xxs">
              <CheckCircle2 size={14} color={colors.onPrimary} />
              <AppText variant="caption" className="text-on-primary opacity-80">
                {tip}
              </AppText>
            </View>
          ))}
        </View>
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
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.OCR_REVIEW, { mealType })}
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-primary"
        >
          <View className="h-[60px] w-[60px] rounded-full bg-on-primary" />
        </Pressable>
        <AppIconButton
          accessibilityLabel="Đèn flash"
          icon={<Zap size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          disabled
        />
      </View>
    </View>
  );
}
