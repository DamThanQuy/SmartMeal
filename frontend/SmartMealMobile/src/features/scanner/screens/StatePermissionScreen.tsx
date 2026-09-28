import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'StatePermission'>;

// design/StatePermission.dc.html. Camera thật (expo-camera) chưa nối nên "Cho phép camera" chỉ
// thử lại đúng màn camera trước đó (returnTo); "Mở cài đặt máy" chưa có OS setting thật để mở.
export function StatePermissionScreen({ navigation, route }: Props) {
  const { mealType, returnTo } = route.params;
  const { colors } = useTheme();

  const handleAllow = () => {
    if (returnTo === 'Fridge') {
      navigation.replace(MAIN_STACK_ROUTES.FRIDGE);
    } else {
      navigation.replace(MAIN_STACK_ROUTES.BARCODE, { mealType: mealType ?? 'snack' });
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Quét sản phẩm" onBack={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })} />
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
          <Camera size={34} color={colors.primary} />
        </View>
        <AppText variant="h2" className="text-center">
          SmartMeal cần quyền dùng camera
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          Camera dùng để quét mã vạch, nhãn dinh dưỡng và chụp món ăn. Ảnh chỉ được dùng để phân
          tích bữa ăn của bạn.
        </AppText>

        <View className="mt-sm w-full gap-sm">
          <AppButton label="Cho phép camera" onPress={handleAllow} />
          {/* Chưa có API mở Settings hệ điều hành thật trong phạm vi mock UI. */}
          <AppButton
            label="Mở cài đặt máy"
            variant="outline"
            disabled
          />
          <AppButton
            label="Nhập thủ công"
            variant="text"
            onPress={() =>
              navigation.replace(MAIN_STACK_ROUTES.FOOD_SEARCH, { mealType: mealType ?? 'snack' })
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
